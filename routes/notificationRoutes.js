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

// ==========================================
// 1. SAVE SUBSCRIPTION & FIRE INSTANT WELCOME PUSH
// ==========================================
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

        const userRes = await pool.query('SELECT username, preferred_language FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0] || {};
        const lang = user.preferred_language || 'en';
        const name = user.username || 'User';

        const welcomeTextEn = `🎉 Thank you {{name}} for enabling notifications! Important updates and reminders will notify you now, don't miss them!`;
        const welcomeTextTe = `🎉 నోటిఫికేషన్‌లను ప్రారంభించినందుకు ధన్యవాదాలు {{name}}! ముఖ్యమైన అప్‌డేట్‌లు ఇకపై మీకు వస్తాయి, కోల్పోకండి!`;

        let messageBody = lang === 'te' ? welcomeTextTe : welcomeTextEn;
        messageBody = messageBody.replace(/{{name}}/g, name);

        const title = lang === 'te' ? "సబ్హామ్స్ PMMS" : "Subhams PMMS";
        const payload = JSON.stringify({ title, body: messageBody, url: "/" });

        await webpush.sendNotification({
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }
        }, payload);

        await pool.query('INSERT INTO notification_logs (user_id, title, body) VALUES ($1, $2, $3)', [userId, title, messageBody]);

        res.status(201).json({ message: "Subscribed and welcome push sent successfully!" });
    } catch (err) {
        console.error("Subscription & Welcome Push Error:", err);
        res.status(500).json({ error: "Failed to process subscription." });
    }
});

// ==========================================
// 2. UPDATE USER LANGUAGE PREFERENCE
// ==========================================
router.put('/language', protect, async (req, res) => {
    try {
        const { lang } = req.body;
        const userId = req.user.userId;

        if (!['en', 'te'].includes(lang)) {
            return res.status(400).json({ error: "Invalid language selection." });
        }

        await pool.query('UPDATE users SET preferred_language = $1 WHERE id = $2', [lang, userId]);
        res.json({ message: "Language preference saved successfully!" });
    } catch (err) {
        console.error("Language Update Error:", err);
        res.status(500).json({ error: "Failed to update language." });
    }
});

// ==========================================
// 3. SMART BEHAVIOR-BASED NOTIFICATION CHECK (Event-Driven on App Open)
// ==========================================
router.post('/check-behavior', protect, async (req, res) => {
    try {
        const userId = req.user.userId;

        const settingsRes = await pool.query('SELECT * FROM system_settings WHERE id = 1');
        if (settingsRes.rows.length === 0 || !settingsRes.rows[0].notifications_enabled) {
            return res.json({ status: "skipped", reason: "Kill switch is OFF" });
        }
        const settings = settingsRes.rows[0];

        const subRes = await pool.query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
        if (subRes.rows.length === 0) {
            return res.json({ status: "skipped", reason: "No active push subscription" });
        }
        const sub = subRes.rows[0];

        const userRes = await pool.query('SELECT username, preferred_language, last_reminder_at, last_budget_alert_at, last_savings_alert_at FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];
        const lang = user.preferred_language || 'en';
        const name = user.username || 'User';

        const now = new Date();

        // --- CHECK A: 24-Hour Inactivity Reminder ---
        const lastTxRes = await pool.query('SELECT MAX(date) as last_date FROM transactions WHERE user_id = $1', [userId]);
        const lastTxDate = lastTxRes.rows[0].last_date ? new Date(lastTxRes.rows[0].last_date) : null;
        const hoursSinceTx = lastTxDate ? (now - lastTxDate) / (1000 * 60 * 60) : 999;
        const hoursSinceLastReminder = user.last_reminder_at ? (now - new Date(user.last_reminder_at)) / (1000 * 60 * 60) : 999;

        if (hoursSinceTx >= 24 && hoursSinceLastReminder >= 24) {
            let bodyText = lang === 'te' ? settings.reminder_text_te : settings.reminder_text_en;
            bodyText = bodyText.replace(/{{name}}/g, name);
            const title = lang === 'te' ? "సబ్హామ్స్ PMMS రిమైండర్" : "Subhams PMMS Reminder";

            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body: bodyText, url: "/" }));
            
            await pool.query('UPDATE users SET last_reminder_at = NOW() WHERE id = $1', [userId]);
            await pool.query('INSERT INTO notification_logs (user_id, title, body) VALUES ($1, $2, $3)', [userId, title, bodyText]);

            return res.json({ status: "sent", type: "reminder" });
        }

        // --- CHECK B: Monthly Budget Health Alert (>80% Spent) ---
        const finRes = await pool.query(`
            SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
                   COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
            FROM transactions 
            WHERE user_id = $1 AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
        `, [userId]);

        const income = parseFloat(finRes.rows[0].income);
        const expense = parseFloat(finRes.rows[0].expense);
        const daysSinceLastBudgetAlert = user.last_budget_alert_at ? (now - new Date(user.last_budget_alert_at)) / (1000 * 60 * 60 * 24) : 999;

        if (income > 0 && (expense / income) >= 0.8 && daysSinceLastBudgetAlert >= 7) {
            const percent = Math.round((expense / income) * 100);
            const title = lang === 'te' ? "⚠️ బడ్జెట్ హెచ్చరిక" : "⚠️ Budget Health Alert";
            const body = lang === 'te' 
                ? `హే {{name}}! మీ ఈ నెల ఖర్చులు మీ ఆదాయంలో ${percent}% దాటాయి. దయచేసి సమీక్షించండి!`
                : `Hey {{name}}! Your monthly expenses have reached ${percent}% of your income. Please review your budget!`;
            
            const personalizedBody = body.replace(/{{name}}/g, name);

            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body: personalizedBody, url: "/" }));
            
            await pool.query('UPDATE users SET last_budget_alert_at = NOW() WHERE id = $1', [userId]);
            await pool.query('INSERT INTO notification_logs (user_id, title, body) VALUES ($1, $2, $3)', [userId, title, personalizedBody]);

            return res.json({ status: "sent", type: "budget_alert" });
        }

        res.json({ status: "checked", message: "No behavior triggers met at this time." });
    } catch (err) {
        console.error("Behavior Check Error:", err);
        res.status(500).json({ error: "Failed to process behavior check." });
    }
});

module.exports = router;