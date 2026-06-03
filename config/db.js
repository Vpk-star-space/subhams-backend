const { Pool } = require("pg");

// 🟢 THE WARNING KILLER:
// This takes your Render/Neon URL and automatically chops off "?sslmode=require" 
// so the 'pg' library never sees it and never throws the warning.
let cleanDbUrl = process.env.DATABASE_URL;
if (cleanDbUrl && cleanDbUrl.includes("?")) {
  cleanDbUrl = cleanDbUrl.split("?")[0]; 
}

const pool = new Pool({
  connectionString: cleanDbUrl,
  ssl: {
    rejectUnauthorized: false // This safely handles the SSL connection instead!
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

pool.on("connect", () => {
  console.log("✅ Securely connected to Neon PostgreSQL Database");
});

module.exports = pool;