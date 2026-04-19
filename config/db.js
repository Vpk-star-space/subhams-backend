const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // 🚀 FIXED: Give Neon up to 15 seconds to wake up from a deep sleep
  connectionTimeoutMillis: 15000, 
  
  // 🚀 FIXED: Keep the connection alive for 60 seconds before letting it sleep
  idleTimeoutMillis: 60000       
});

// This catches unexpected errors in the background without crashing your server
pool.on("error", (err) => {
  console.log("⚠️ Neon DB connection issue (likely waking up). It will retry automatically.");
});

module.exports = pool;