require('dotenv').config(); 
const pool = require('../config/db'); 

const setupPushDatabase = async () => {
    try {
        console.log("⏳ Setting up Master Notification Tables...");

        // 1. ADD LANGUAGE PREFERENCE & TRACKING COLUMNS TO USERS TABLE
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en',
            ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS last_budget_alert_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS last_savings_alert_at TIMESTAMP
        `);
        console.log("✅ Added Language Preference & Tracking Columns to Users table.");

        // 2. CREATE PUSH SUBSCRIPTIONS TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                endpoint TEXT NOT NULL UNIQUE,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Push Subscriptions table created.");

        // 3. CREATE SYSTEM SETTINGS TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id SERIAL PRIMARY KEY,
                notifications_enabled BOOLEAN DEFAULT TRUE,
                
                reminder_text_en TEXT DEFAULT 'Hey {{name}}! You haven''t noted today''s transactions. Do it in 2 secs! ⏱️',
                reminder_text_te TEXT DEFAULT 'హే {{name}}! మీరు ఈరోజు లావాదేవీలను నమోదు చేయలేదు. కేవలం 2 సెకన్లలో చేయండి! ⏱️',
                
                privacy_text_en TEXT DEFAULT '🔒 Security Reminder: Subhams PMMS is 100% private. We do not connect to your bank accounts. Only you can track what you manually enter!',
                privacy_text_te TEXT DEFAULT '🔒 భద్రతా రిమైండర్: Subhams PMMS 100% సురక్షితమైనది. మేము మీ బ్యాంక్ ఖాతాలకు కనెక్ట్ చేయము. మీరు నమోదు చేసినవి మాత్రమే మీరు ట్రాక్ చేయగలరు!'
            )
        `);
        
        const checkSettings = await pool.query('SELECT COUNT(*) FROM system_settings');
        if (parseInt(checkSettings.rows[0].count) === 0) {
            await pool.query(`INSERT INTO system_settings (notifications_enabled) VALUES (TRUE)`);
            console.log("✅ Default System Settings inserted.");
        } else {
            console.log("✅ System Settings already exist.");
        }

        // 4. CREATE NOTIFICATION AUDIT LOG TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notification_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                body TEXT NOT NULL,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Notification Logs table created.");

        // 5. CREATE CUSTOM AUTOMATIONS TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS custom_automations (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                message_en TEXT NOT NULL,
                message_te TEXT NOT NULL,
                frequency VARCHAR(50) DEFAULT 'daily',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Custom Automations table created.");

        console.log("🎉 Master Notification Database is Ready!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Database Setup Error:", err);
        process.exit(1);
    }
};

setupPushDatabase();