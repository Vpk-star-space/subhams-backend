const pool = require("../config/db");

// ================= 1. ADD TRANSACTION =================
exports.addTransaction = async (req, res) => {
  try {
    const { title, amount, type, category, date } = req.body;
    const userId = req.user.userId;

    const result = await pool.query(
      `INSERT INTO transactions (user_id, title, amount, type, category, date) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *, id AS "_id"`, // We return 'id AS _id' so React doesn't break
      [userId, title, amount, type, category, date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ================= 2. GET ALL TRANSACTIONS =================
exports.getTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *, id AS "_id" FROM transactions 
       WHERE user_id = $1 
       ORDER BY date DESC, created_at DESC`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= 3. FILTER & SEARCH TRANSACTIONS =================
exports.filterTransactions = async (req, res) => {
  try {
    // 🚀 NEW: Notice we added 'search' here to catch what the frontend sends!
    const { type, category, startDate, endDate, search } = req.query;
    
    let query = `SELECT *, id AS "_id" FROM transactions WHERE user_id = $1`;
    let values = [req.user.userId];
    let count = 2; 

    // 1. Dropdown Filters
    if (type && type !== "All") {
      query += ` AND type = $${count}`;
      values.push(type);
      count++;
    }
    if (category && category !== "All") {
      query += ` AND category = $${count}`;
      values.push(category);
      count++;
    }
    
    // 2. Date Range Filter
    if (startDate && endDate) {
      query += ` AND date >= $${count} AND date <= $${count + 1}`;
      values.push(startDate, endDate);
      count += 2;
    }

    // 3. 🚀 THE SEARCH BAR LOGIC
    // ILIKE makes it case-insensitive (so "Rent" and "rent" both work)
    // CAST(amount AS TEXT) allows them to search for numbers like "500"
    if (search && search.trim() !== "") {
      query += ` AND (title ILIKE $${count} OR CAST(amount AS TEXT) ILIKE $${count})`;
      values.push(`%${search.trim()}%`);
      count++;
    }

    query += ` ORDER BY date DESC`;
    
    const result = await pool.query(query, values);
    res.json(result.rows);
    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= 4. SUMMARY =================
exports.getSummary = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
      FROM transactions 
      WHERE user_id = $1
    `, [req.user.userId]);

    const income = Number(result.rows[0].income);
    const expense = Number(result.rows[0].expense);

    res.json({ income, expense, balance: income - expense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= 5. UPDATE =================
exports.updateTransaction = async (req, res) => {
  try {
    const { title, amount, type, category, date } = req.body;
    const result = await pool.query(
      `UPDATE transactions 
       SET title = $1, amount = $2, type = $3, category = $4, date = $5 
       WHERE id = $6 AND user_id = $7 
       RETURNING *, id AS "_id"`,
      [title, amount, type, category, date, req.params.id, req.user.userId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ================= 6. DELETE =================
exports.deleteTransaction = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *",
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= 7. MONTHLY GRAPH DATA =================
exports.getMonthlyData = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        EXTRACT(YEAR FROM date) AS year, 
        EXTRACT(MONTH FROM date) AS month, 
        type, 
        SUM(amount) AS total 
      FROM transactions 
      WHERE user_id = $1 
      GROUP BY year, month, type 
      ORDER BY year, month
    `, [req.user.userId]);

    const formattedData = result.rows.reduce((acc, item) => {
      const monthName = new Date(item.year, item.month - 1).toLocaleString('default', { month: 'short' });
      const yearMonth = `${monthName} ${item.year}`;
      let existingMonth = acc.find(m => m.name === yearMonth);
      if (!existingMonth) {
        existingMonth = { name: yearMonth, income: 0, expense: 0 };
        acc.push(existingMonth);
      }
      if (item.type === "income") existingMonth.income = Number(item.total);
      if (item.type === "expense") existingMonth.expense = Number(item.total);
      return acc;
    }, []);

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= 8. SMART INSIGHTS =================
exports.getInsights = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT category, SUM(amount) AS totalamount 
      FROM transactions 
      WHERE user_id = $1 AND type = 'expense'
      GROUP BY category 
      ORDER BY totalamount DESC LIMIT 1
    `, [req.user.userId]);

    if (result.rows.length > 0) {
      res.json({ topCategory: result.rows[0].category, amount: Number(result.rows[0].totalamount) });
    } else {
      res.json({ topCategory: "None", amount: 0 });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= 9. INTEREST =================
exports.calculateInterest = (req, res) => {
  const { principal, rate, time } = req.body;
  const interest = (Number(principal) * Number(rate) * Number(time)) / 100;
  res.json({ interest, total: Number(principal) + interest });
};



