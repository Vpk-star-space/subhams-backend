const pool = require('../config/db');
const webpush = require('web-push');

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

const getAdminStats = async (req, res) => {
    try {
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        const subCount = await pool.query('SELECT COUNT(DISTINCT user_id) FROM push_subscriptions');
        const langBreakdown = await pool.query('SELECT preferred_language, COUNT(*) FROM users GROUP BY preferred_language');
        const logStats = await pool.query(`
            SELECT 
                COUNT(*) as total_sent,
                COUNT(CASE WHEN title LIKE '%Reminder%' OR title LIKE '%రిమైండర్%' THEN 1 END) as reminders_sent,
                COUNT(CASE WHEN title LIKE '%Budget%' OR title LIKE '%బడ్జెట్%' THEN 1 END) as budget_alerts_sent,
                COUNT(CASE WHEN title LIKE '%Security%' OR title LIKE '%భద్రతా%' OR title LIKE '%ప్రైవసీ%' THEN 1 END) as privacy_alerts_sent
            FROM notification_logs
        `);

        res.json({
            totalUsers: parseInt(userCount.rows[0].count),
            activeSubscribers: parseInt(subCount.rows[0].count),
            languages: langBreakdown.rows,
            logs: logStats.rows[0]
        });
    } catch (err) {
        console.error("Admin Stats Error:", err);
        res.status(500).json({ error: "Failed to load admin stats." });
    }
};

const getSettings = async (req, res) => {
    try {
        const settings = await pool.query('SELECT * FROM system_settings ORDER BY id ASC LIMIT 1');
        res.json({ settings: settings.rows[0] });
    } catch (err) {
        console.error("Get Settings Error:", err);
        res.status(500).json({ error: "Failed to fetch settings." });
    }
};

const updateSettings = async (req, res) => {
    try {
        const { 
            notifications_enabled, 
            reminder_enabled,
            budget_alert_enabled,
            privacy_enabled,
            reminder_text_en, 
            reminder_text_te, 
            budget_text_en,
            budget_text_te,
            privacy_text_en, 
            privacy_text_te 
        } = req.body;

        await pool.query(
            `UPDATE system_settings 
             SET notifications_enabled = $1, 
                 reminder_enabled = $2,
                 budget_alert_enabled = $3,
                 privacy_enabled = $4,
                 reminder_text_en = $5, 
                 reminder_text_te = $6, 
                 budget_text_en = $7,
                 budget_text_te = $8,
                 privacy_text_en = $9, 
                 privacy_text_te = $10 
             WHERE id = 1`,
            [
                notifications_enabled, 
                reminder_enabled, 
                budget_alert_enabled, 
                privacy_enabled,
                reminder_text_en, 
                reminder_text_te, 
                budget_text_en,
                budget_text_te,
                privacy_text_en, 
                privacy_text_te
            ]
        );

        res.json({ message: "System settings and automation templates saved successfully!" });
    } catch (err) {
        console.error("Update Settings Error:", err);
        res.status(500).json({ error: "Failed to update settings." });
    }
};

const sendManualNotification = async (req, res) => {
    try {
        const { targetUserId, title_en, body_en, title_te, body_te } = req.body;

        const settings = await pool.query('SELECT notifications_enabled FROM system_settings WHERE id = 1');
        if (!settings.rows[0].notifications_enabled) {
            return res.status(400).json({ error: "Master Kill Switch is OFF. Notifications are disabled." });
        }

        let subscriptionsQuery;
        if (targetUserId === 'all') {
            subscriptionsQuery = await pool.query(`
                SELECT p.*, u.username, u.preferred_language, u.silent_mode 
                FROM push_subscriptions p 
                JOIN users u ON p.user_id = u.id
            `);
        } else {
            subscriptionsQuery = await pool.query(`
                SELECT p.*, u.username, u.preferred_language, u.silent_mode 
                FROM push_subscriptions p 
                JOIN users u ON p.user_id = u.id 
                WHERE p.user_id = $1
            `, [targetUserId]);
        }

        const subscriptions = subscriptionsQuery.rows;
        let successCount = 0;

        for (const sub of subscriptions) {
            const isTelugu = sub.preferred_language === 'te';
            const selectedTitle = (isTelugu && title_te) ? title_te : (title_en || "Subhams PMMS");
            const selectedBodyTemplate = (isTelugu && body_te) ? body_te : body_en;
            const personalizedBody = selectedBodyTemplate.replace(/{{name}}/g, sub.username || 'User');

            const payload = JSON.stringify({
                title: selectedTitle,
                body: personalizedBody,
                url: '/',
                silent: sub.silent_mode || false
            });

            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                }, payload);
                successCount++;
                await pool.query('INSERT INTO notification_logs (user_id, title, body) VALUES ($1, $2, $3)', [sub.user_id, selectedTitle, personalizedBody]);
            } catch (pushErr) {
                if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                    await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
                }
            }
        }

        res.json({ 
            message: `Notification broadcasted successfully!`,
            reach: successCount,
            totalTargets: subscriptions.length 
        });

    } catch (err) {
        console.error("Broadcast Error:", err);
        res.status(500).json({ error: "Failed to send broadcast." });
    }
};

const testReminderNow = async (req, res) => {
    try {
        const settingsRes = await pool.query('SELECT * FROM system_settings WHERE id = 1');
        const settings = settingsRes.rows[0];

        const query = `
            SELECT DISTINCT u.id, u.username, u.preferred_language, u.silent_mode, p.endpoint, p.p256dh, p.auth 
            FROM users u
            JOIN push_subscriptions p ON u.id = p.user_id
        `;
        const users = await pool.query(query);
        let sent = 0;

        for (const user of users.rows) {
            let messageText = user.preferred_language === 'te' 
                ? settings.reminder_text_te 
                : settings.reminder_text_en;

            messageText = messageText.replace(/{{name}}/g, user.username || 'User');
            const title = user.preferred_language === 'te' ? "సబ్హామ్స్ PMMS రిమైండర్" : "Subhams PMMS Reminder";

            const payload = JSON.stringify({
                title,
                body: messageText,
                url: "/",
                silent: user.silent_mode || false
            });

            try {
                await webpush.sendNotification({
                    endpoint: user.endpoint,
                    keys: { p256dh: user.p256dh, auth: user.auth }
                }, payload);
                sent++;
            } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [user.endpoint]);
                }
            }
        }

        res.json({ message: `Test reminder pushed successfully to ${sent} active devices!` });
    } catch (err) {
        console.error("Test Reminder Error:", err);
        res.status(500).json({ error: "Failed to fire test reminder." });
    }
};

const getAdminUsersList = async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.username, u.email, u.preferred_language, u.silent_mode,
                   CASE WHEN p.id IS NOT NULL THEN TRUE ELSE FALSE END as has_notifications
            FROM users u
            LEFT JOIN push_subscriptions p ON u.id = p.user_id
            ORDER BY u.id DESC
        `;
        const result = await pool.query(query);
        res.json({ users: result.rows });
    } catch (err) {
        console.error("Admin Users List Error:", err);
        res.status(500).json({ error: "Failed to fetch users list." });
    }
};

const createCustomAutomation = async (req, res) => {
    try {
        const { title, message_en, message_te, frequency } = req.body;
        if (!title || !message_en) return res.status(400).json({ error: "Title and English message are required." });

        await pool.query(
            `INSERT INTO custom_automations (title, message_en, message_te, frequency) VALUES ($1, $2, $3, $4)`,
            [title, message_en, message_te || message_en, frequency || 'daily']
        );

        res.status(201).json({ message: "Custom automation created successfully!" });
    } catch (err) {
        console.error("Create Automation Error:", err);
        res.status(500).json({ error: "Failed to create custom automation." });
    }
};

module.exports = {
    getAdminStats,
    getSettings,
    updateSettings,
    sendManualNotification,
    testReminderNow,
    getAdminUsersList,
    createCustomAutomation
};