const cron = require('node-cron');
const pool = require('../config/db');
// 🚀 FIXED: Importing the correct function name from your emailService
const { sendInactivityInsight } = require('./emailService'); 

const startInactivityWatcher = () => {
  // This runs every minute to check the "clocks" of all users
  cron.schedule('* * * * *', async () => {
    console.log("🔍 Checking for inactive users...");
    
    try {
      // 🚀 REDUCED TIME: Checks for users inactive between 2 and 3 minutes ago
      const result = await pool.query(`
        SELECT id, username, email 
        FROM users 
        WHERE last_active <= NOW() - INTERVAL '2 minutes'
        AND last_active > NOW() - INTERVAL '3 minutes'
      `);

      if (result.rows.length > 0) {
        console.log(`⚠️ Found ${result.rows.length} inactive users. Sending insights...`);
        
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
          sendInactivityInsight(user.email, user.username, summary)
            .then(() => console.log(`✅ Email sent to ${user.email}`))
            .catch(err => console.error(`❌ Email failed for ${user.email}:`, err));
        }
      }
    } catch (err) {
      console.error("❌ Watcher Database Error:", err.message);
    }
  });
};

module.exports = startInactivityWatcher;