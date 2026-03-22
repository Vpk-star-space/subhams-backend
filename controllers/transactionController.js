const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");

// ADD
exports.addTransaction = async (req, res) => {
  try {
    const data = await Transaction.create({ ...req.body, user: req.user.userId });
    res.status(201).json(data);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// GET ALL
exports.getTransactions = async (req, res) => {
  try {
    const data = await Transaction.find({ user: req.user.userId }).sort({ createdAt: -1 });
    res.json(data);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ================= FILTER TRANSACTIONS =================
exports.filterTransactions = async (req, res) => {
  try {
    const { type, category, startDate, endDate } = req.query;
    let query = { user: req.user.userId };

    // If the user selected a specific type (and not "All"), add it to the search
    if (type && type !== "All") query.type = type;
    
    // If the user selected a specific category (and not "All"), add it to the search
    if (category && category !== "All") query.category = category;
    
    // If the user picked a date range, search between those dates
    if (startDate && endDate) {
      query.date = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }

    const data = await Transaction.find(query).sort({ date: -1 });
    res.json(data);
  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
};


// SUMMARY
exports.getSummary = async (req, res) => {
  try {
    const data = await Transaction.find({ user: req.user.userId });
    let income = 0, expense = 0;
    data.forEach(t => {
      if (t.type === "income") income += Number(t.amount);
      else expense += Number(t.amount);
    });
    res.json({ income, expense, balance: income - expense });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// INTEREST
exports.calculateInterest = (req, res) => {
  const { principal, rate, time } = req.body;
  const interest = (Number(principal) * Number(rate) * Number(time)) / 100;
  res.json({ interest, total: Number(principal) + interest });
};

// ================= UPDATE =================
exports.updateTransaction = async (req, res) => {
  try {
    const updated = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// ================= DELETE =================
exports.deleteTransaction = async (req, res) => {
  try {
    const deleted = await Transaction.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Transaction not found in Database" });
    }
    res.json({ message: "Deleted successfully" });
  } catch (error) { 
    res.status(500).json({ message: "Server error: " + error.message }); 
  }
};

// ================= MONTHLY GRAPH DATA (Interview Level) =================
exports.getMonthlyData = async (req, res) => {
  try {
    const data = await Transaction.aggregate([
      // 1. Only get transactions for the logged-in user
      { $match: { user: new mongoose.Types.ObjectId(req.user.userId) } },
      
      // 2. Group the data by Year, Month, and Type (Income vs Expense)
      {
        $group: {
          _id: {
            month: { $month: "$date" },
            year: { $year: "$date" },
            type: "$type"
          },
          total: { $sum: "$amount" }
        }
      },
      // 3. Sort them chronologically
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // 4. Format the raw MongoDB data so Recharts can read it easily
    const formattedData = data.reduce((acc, item) => {
      // Convert month number to short name (e.g., "Jan", "Feb")
      const monthName = new Date(item._id.year, item._id.month - 1).toLocaleString('default', { month: 'short' });
      const yearMonth = `${monthName} ${item._id.year}`;
      
      let existingMonth = acc.find(m => m.name === yearMonth);
      if (!existingMonth) {
        existingMonth = { name: yearMonth, income: 0, expense: 0 };
        acc.push(existingMonth);
      }
      
      if (item._id.type === "income") existingMonth.income = item.total;
      if (item._id.type === "expense") existingMonth.expense = item.total;
      
      return acc;
    }, []);

    res.json(formattedData);
  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
};

// ================= SMART INSIGHTS =================
exports.getInsights = async (req, res) => {
  try {
    const data = await Transaction.aggregate([
      // 1. Find only the logged-in user's expenses
      { $match: { user: new mongoose.Types.ObjectId(req.user.userId), type: "expense" } },
      // 2. Group them by category and add up the amounts
      { $group: { _id: "$category", totalAmount: { $sum: "$amount" } } },
      // 3. Sort them from highest to lowest
      { $sort: { totalAmount: -1 } },
      // 4. Only keep the top 1 result
      { $limit: 1 }
    ]);

    if (data.length > 0) {
      res.json({ topCategory: data[0]._id, amount: data[0].totalAmount });
    } else {
      res.json({ topCategory: "None", amount: 0 });
    }
  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
};


// Kept the filter placeholder since you aren't using the real one yet
exports.getByType = async (req, res) => { res.json({ msg: "Filter logic" }); };