require("dotenv").config();
const express = require("express");
const cors = require("cors");
const startInactivityWatcher = require("./utils/watcher");



// 🚀 NEW: This single line automatically connects to your Neon database!
const pool = require("./config/db"); 

const authRoutes = require("./routes/authRoutes");
// Note: We will fix the transactionRoutes in the next step, so leave it as is for now
const transactionRoutes = require("./routes/transactionRoutes"); 

const app = express();
app.use(cors({
    origin: [ "https://subhams-vpk.vercel.app/"], // Add your deployed URL here
    credentials: true
}));

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes); 

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startInactivityWatcher(); // 🚀 THE WATCHER IS NOW LIVE!
});