const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const protect = require('../middleware/authMiddleware');
const { 
    getAdminStats, 
    getSettings, 
    updateSettings, 
    sendManualNotification,
    testReminderNow,
    getAdminUsersList,
    createCustomAutomation 
} = require('../controllers/adminController');

const verifyAdminEmail = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const userQuery = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);

        if (
            userQuery.rows.length === 0 || 
            userQuery.rows[0].email.toLowerCase() !== 'pavanvenkat63@gmail.com'
        ) {
            return res.status(403).json({ error: "Access Denied: Master Admin authorization required." });
        }
        next();
    } catch (err) {
        console.error("Admin Auth Guard Error:", err);
        res.status(500).json({ error: "Server error during authorization." });
    }
};

router.get('/stats', protect, verifyAdminEmail, getAdminStats);
router.get('/settings', protect, verifyAdminEmail, getSettings);
router.put('/settings', protect, verifyAdminEmail, updateSettings);
router.post('/broadcast', protect, verifyAdminEmail, sendManualNotification);
router.post('/test-reminder', protect, verifyAdminEmail, testReminderNow);
router.get('/users-list', protect, verifyAdminEmail, getAdminUsersList);
router.post('/automations', protect, verifyAdminEmail, createCustomAutomation);

module.exports = router;