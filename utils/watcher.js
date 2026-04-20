const cron = require('node-cron');
const pool = require('../config/db');
const { sendInactivityInsight } = require('./emailService'); 

const startInactivityWatcher = () => {
  // This runs every minute to check the clocks
  cron.schedule('* * * * *', async () => {
    
    try {
      // 🟢 THE FIX: 
      // 1. Are they offline for exactly 6 minutes?
      // 2. DID THEY MAKE CHANGES? (has_changes = true)
      const result = await pool.query(`
        SELECT id, username, email 
        FROM users 
        WHERE last_active <= NOW() - INTERVAL '6 minutes'
        AND last_active > NOW() - INTERVAL '7 minutes'
        AND has_changes = true
      `);

      if (result.rows.length > 0) {
        console.log(`⚠️ Found ${result.rows.length} users with changes who went offline. Sending email...`);
        
        for (const user of result.rows) {
          // Calculate the financial summary for the email
          const sumResult = await pool.query(`
            SELECT 
              COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
            FROM transactions 
            WHERE user_id = $1
          `, [user.id]);

          const income = Number(sumResult.rows[0].income);
          const expense = Number(sumResult.rows[0].expense);
          
          const summary = {
            income,
            expense,
            balance: income - expense
          };

          // Send the beautiful bilingual email
          await sendInactivityInsight(user.email, user.username, summary);
          console.log(`✅ Offline Email sent to ${user.email}`);

          // 🟢 TURN THE SWITCH OFF: Email sent, waiting for the next change.
          await pool.query("UPDATE users SET has_changes = false WHERE id = $1", [user.id]);
        }
      }
    } catch (err) {
      console.error("❌ Watcher Database Error:", err.message);
    }
  });
};

module.exports = startInactivityWatcher;