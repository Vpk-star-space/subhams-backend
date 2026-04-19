require("dotenv").config();
const express = require("express");
const cors = require("cors");
const startInactivityWatcher = require("./utils/watcher");
const pool = require("./config/db"); 

const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes"); 

const app = express();

// 🛠️ FIXED CORS: Only one instance, no trailing slash, and allows credentials
app.use(cors({
    origin: ["https://subhams-vpk.vercel.app", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes); 

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startInactivityWatcher(); 
});