const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const rateLimit = require("express-rate-limit");

// 🛡️ SECURITY: Limit attempts to 10 every 15 minutes to prevent spam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: { error: "Too many attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🚀 THE ROUTES
// We apply the limiter to Register, Login, and Google for safety
router.post("/register", authLimiter, authController.registerUser);
router.post("/verify-otp", authController.verifyOTP);
router.post("/login", authLimiter, authController.loginUser);
router.post("/google-login", authLimiter, authController.googleLogin);
router.post("/refresh", authController.refreshAccessToken);

module.exports = router;