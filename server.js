require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./config/db"); 
const startInactivityWatcher = require("./utils/watcher");

const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes"); 
const { router: notificationRoutes, evaluateUserBehavior, checkAndSendInactivityReminders } = require("./routes/notificationRoutes");

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

// ==========================================
// 🟢 PIGGYBACK TRIGGER ENGINE
// ==========================================
let lastCheckTime = 0;

const runNotificationChecks = async () => {
    try {
        console.log("🔍 Piggyback: Running smart notification checks...");
        
        // 1. Check inactive users (Database enforces the 1-hour gap & night-only rule)
        await checkAndSendInactivityReminders();

        // 2. Check active users for budget alerts 1-by-1
        const subs = await pool.query("SELECT DISTINCT user_id FROM push_subscriptions");
        for (const row of subs.rows) {
            await evaluateUserBehavior(row.user_id);
            await new Promise(resolve => setTimeout(resolve, 500)); // Prevents spam
        }
        
        console.log("✅ Smart checks completed.");
    } catch (err) {
        console.error("Notification check error:", err);
    }
};

app.use((req, res, next) => {
    const now = Date.now();
    // Fire the piggyback check every 5 minutes during active traffic
    if (now - lastCheckTime > 300000) { 
        lastCheckTime = now;
        runNotificationChecks().catch(console.error);
    }
    next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", require("./routes/adminRoutes"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    
    // Start the 1-minute email digest watcher
    startInactivityWatcher();

    // Run an initial notification check 5 seconds after server startup
    setTimeout(runNotificationChecks, 5000);
});