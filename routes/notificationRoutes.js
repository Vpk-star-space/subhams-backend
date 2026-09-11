const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const protect = require('../middleware/authMiddleware');
const webpush = require('web-push');

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// 🟢 1-BY-1 BEHAVIOR CHECK (NO AMOUNTS, RESPECTS TELUGU / ENGLISH)
const evaluateUserBehavior = async (userId) => {
    try {
        const settingsRes = await pool.query('SELECT * FROM system_settings WHERE id = 1');
        if (settingsRes.rows.length === 0 || !settingsRes.rows[0].notifications_enabled) return false;
        const settings = settingsRes.rows[0];
        if (!settings.budget_alert_enabled) return false;

        // 1. Fetch user's subscription
        const subRes = await pool.query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
        if (subRes.rows.length === 0) return false;
        const sub = subRes.rows[0];

        // 2. Fetch user profile
        const userRes = await pool.query(`
            SELECT username, preferred_language, silent_mode, last_behavior_alert_at 
            FROM users WHERE id = $1
        `, [userId]);
        const user = userRes.rows[0];
        if (!user) return false;

        const lang = user.preferred_language || 'en';
        const name = user.username || 'User';
        const now = new Date();

        // 3. Find when user last updated transactions
        const txTimeRes = await pool.query(`
            SELECT MAX(created_at) as last_created, MAX(date) as last_date 
            FROM transactions WHERE user_id = $1
        `, [userId]);

        const lastTxTime = txTimeRes.rows[0].last_created 
            ? new Date(txTimeRes.rows[0].last_created) 
            : (txTimeRes.rows[0].last_date ? new Date(txTimeRes.rows[0].last_date) : null);

        if (!lastTxTime) return false; // No transactions yet

        // Must be at least 3 minutes after transaction change (user has finished and left)
        const minutesSinceTx = (now - lastTxTime) / (1000 * 60);
        if (minutesSinceTx < 3) return false; 

        // Check if alert was already sent for this transaction or newer
        const lastAlertTime = user.last_behavior_alert_at ? new Date(user.last_behavior_alert_at) : null;
        if (lastAlertTime && lastAlertTime >= lastTxTime) {
            return false; // Already notified
        }

        // 4. Calculate monthly financial behavior
        const finRes = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
            FROM transactions 
            WHERE user_id = $1 AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
        `, [userId]);

        const income = parseFloat(finRes.rows[0].income);
        const expense = parseFloat(finRes.rows[0].expense);

        let title = "";
        let body = "";

        // CASE A: HIGH EXPENDITURE OR DEFICIT (Expenses >= 80% or Exceeding Income)
        if ((income > 0 && (expense / income) >= 0.8) || (income === 0 && expense > 0)) {
            if (lang === 'te') {
                title = "⚠️ బడ్జెట్ హెచ్చరిక";
                body = `హే ${name}! ఈ నెల మీ ఖర్చులు చాలా వేగంగా పెరుగుతున్నాయి. దయచేసి మీ ఖర్చులను సమీక్షించి, బడ్జెట్‌ను కాపాడుకోండి!`;
            } else {
                title = "⚠️ High Spending Alert";
                body = `Hey ${name}! Your monthly expenses are running high. Keep an eye on your budget and maintain your savings habit!`;
            }
        } 
        // CASE B: GREAT SAVINGS (Expenses <= 40% with Positive Income)
        else if (income > 0 && (expense / income) <= 0.4) {
            if (lang === 'te') {
                title = "🌟 అద్భుతమైన పొదుపు!";
                body = `శభాష్ ${name}! ఈ నెల మీరు చాలా చక్కగా ఆదా చేస్తున్నారు. మీ ఆర్థిక క్రమశిక్షణ చాలా బాగుంది, ఇలాగే కొనసాగించండి!`;
            } else {
                title = "🌟 Great Saving Habit!";
                body = `Awesome job ${name}! You are saving wonderfully this month. Keep up the disciplined financial habit!`;
            }
        } else {
            return false; // Normal range, no alert needed
        }

        // 5. Send notification
        const pushOptions = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
        await webpush.sendNotification(pushOptions, JSON.stringify({
            title,
            body,
            url: "/",
            silent: user.silent_mode || false
        }));

        // 6. Update user's alert timestamp so it never duplicates
        await pool.query('UPDATE users SET last_behavior_alert_at = NOW() WHERE id = $1', [userId]);
        await pool.query('INSERT INTO notification_logs (user_id, title, body) VALUES ($1, $2, $3)', [userId, title, body]);

        return true;
    } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
            await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
        } else {
            console.error("Behavior Notification Evaluation Error:", err);
        }
        return false;
    }
};

// SUBSCRIBE ROUTE
router.post('/subscribe', protect, async (req, res) => {
    try {
        const subscription = req.body;
        const userId = req.user.userId;

        const check = await pool.query('SELECT id FROM push_subscriptions WHERE endpoint = $1', [subscription.endpoint]);
        if (check.rows.length === 0) {
            await pool.query(
                'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)',
                [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
            );
        }

        const userRes = await pool.query('SELECT username, preferred_language, silent_mode FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0] || {};
        const lang = user.preferred_language || 'en';
        const name = user.username || 'User';

        const title = lang === 'te' ? "సబ్హామ్స్ PMMS" : "Subhams PMMS";
        const body = lang === 'te'
            ? `🎉 నోటిఫికేషన్‌లను ప్రారంభించినందుకు ధన్యవాదాలు ${name}! ముఖ్యమైన ఆర్థిక హెచ్చరికలు ఇకపై మీకు అందుతాయి!`
            : `🎉 Thank you ${name} for enabling notifications! Important financial alerts will notify you here.`;

        await webpush.sendNotification({
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }
        }, JSON.stringify({ title, body, url: "/", silent: user.silent_mode || false }));

        await pool.query('INSERT INTO notification_logs (user_id, title, body) VALUES ($1, $2, $3)', [userId, title, body]);
        res.status(201).json({ message: "Subscribed successfully!" });
    } catch (err) {
        console.error("Subscription Error:", err);
        res.status(500).json({ error: "Failed to process subscription." });
    }
});

// UPDATE PREFERRED LANGUAGE
router.put('/language', protect, async (req, res) => {
    try {
        const { lang } = req.body;
        await pool.query('UPDATE users SET preferred_language = $1 WHERE id = $2', [lang, req.user.userId]);
        res.json({ message: "Language updated!" });
    } catch (err) {
        res.status(500).json({ error: "Language update failed." });
    }
});

// TOGGLE SILENT MODE
router.put('/toggle-silent', protect, async (req, res) => {
    try {
        const { silent } = req.body;
        await pool.query('UPDATE users SET silent_mode = $1 WHERE id = $2', [silent, req.user.userId]);
        res.json({ message: `Silent mode set to ${silent}` });
    } catch (err) {
        res.status(500).json({ error: "Failed to toggle silent mode." });
    }
});

// API TRIGGER: User checks on sync
router.post('/check-behavior', protect, async (req, res) => {
    const sent = await evaluateUserBehavior(req.user.userId);
    res.json({ status: sent ? "sent" : "skipped" });
});

module.exports = {
    router,
    evaluateUserBehavior
};