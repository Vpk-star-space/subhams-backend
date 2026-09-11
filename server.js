require("dotenv").config();
const express = require("express");
const cors = require("cors");
const startInactivityWatcher = require("./utils/watcher");
const pool = require("./config/db"); 

const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes"); 
const { router: notificationRoutes, evaluateUserBehavior } = require("./routes/notificationRoutes");

const app = express();

app.set("trust proxy", 1);

// CORS Configuration
app.use(cors({
    origin: ["https://pmms.subhamsnetworks.in", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", require("./routes/adminRoutes"));

// 🟢 CHECK PENDING NOTIFICATIONS 1-BY-1 (NO EXTERNAL CRON / NO PING NEEDED)
const checkPendingNotifications = async () => {
    try {
        console.log("🔍 Server checking unnotified transaction changes...");
        const subs = await pool.query("SELECT DISTINCT user_id FROM push_subscriptions");
        
        for (const row of subs.rows) {
            await evaluateUserBehavior(row.user_id);
            // 500ms delay between users to send 1 by 1 safely
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log("✅ Check completed.");
    } catch (err) {
        console.error("Notification check error:", err);
    }
};

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    startInactivityWatcher();

    // 1. Run immediately 5 seconds after server starts up
    setTimeout(checkPendingNotifications, 5000);

    // 2. Automatically re-check every 5 minutes while server is on
    setInterval(checkPendingNotifications, 5 * 60 * 1000);
});