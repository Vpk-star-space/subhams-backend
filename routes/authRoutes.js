const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const rateLimit = require("express-rate-limit");
const protect = require("../middleware/authMiddleware");

// 🛡️ INCREASED LIMIT FOR TESTING: Allows 50 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 50, 
  message: { error: "Too many attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🚀 REGULAR ROUTES
router.post("/register", authLimiter, authController.registerUser);
router.post("/verify-otp", authController.verifyOTP);
router.post("/login", authLimiter, authController.loginUser);
router.post("/google-login", authLimiter, authController.googleLogin);
router.post("/refresh", authController.refreshAccessToken);

// 🟢 NEW: FORGOT PASSWORD ROUTES
router.post("/forgot-password", authLimiter, authController.requestPasswordReset);
router.post("/reset-password", authLimiter, authController.resetPassword);

// 🔒 BIOMETRIC ROUTES
router.post('/register-biometric', protect, authController.registerBiometric); 
router.post('/login-biometric', authController.loginBiometric);

module.exports = router;