const cron = require('node-cron');
const pool = require('../config/db');
const webpush = require('web-push');

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

const startReminderCron = () => {
    // Runs automatically every hour
    cron.schedule('0 * * * *', async () => {
        try {
            const settingsRes = await pool.query('SELECT * FROM system_settings WHERE id = 1');
            if (settingsRes.rows.length === 0 || !settingsRes.rows[0].notifications_enabled) {
                return;
            }
            const settings = settingsRes.rows[0];

            const query = `
                SELECT DISTINCT u.id, u.username, u.preferred_language, p.endpoint, p.p256dh, p.auth 
                FROM users u
                JOIN push_subscriptions p ON u.id = p.user_id
                WHERE NOT EXISTS (
                    SELECT 1 FROM transactions t 
                    WHERE t.user_id = u.id AND t.date >= NOW() - INTERVAL '24 hours'
                )
            `;
            const usersToRemind = await pool.query(query);

            for (const user of usersToRemind.rows) {
                let messageText = user.preferred_language === 'te' 
                    ? settings.reminder_text_te 
                    : settings.reminder_text_en;

                // Replace placeholder with real name
                messageText = messageText.replace(/{{name}}/g, user.username || 'User');

                const payload = JSON.stringify({
                    title: user.preferred_language === 'te' ? "సబ్హామ్స్ PMMS రిమైండర్" : "Subhams PMMS Reminder",
                    body: messageText,
                    url: "/"
                });

                try {
                    await webpush.sendNotification({
                        endpoint: user.endpoint,
                        keys: { p256dh: user.p256dh, auth: user.auth }
                    }, payload);
                } catch (err) {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [user.endpoint]);
                    }
                }
            }
            console.log(`⏰ Automated Reminders executed. Sent to ${usersToRemind.rows.length} devices.`);
        } catch (err) {
            console.error("Reminder Cron Error:", err);
        }
    });
};

module.exports = startReminderCron;