const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const rateLimit = require("express-rate-limit");
const protect = require("../middleware/authMiddleware");

// 🛡️ 1. OTP LIMITER: Extremely strict (prevents email spam/costs)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 OTP requests per 15 mins per IP/Email
  message: { error: "Too many OTP requests. Please wait 15 minutes." },
});

// 🛡️ 2. GOOGLE LIMITER: Separate bucket
const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Google is secure, so we allow more attempts
  message: { error: "Too many Google login attempts. Please wait." },
});

// 🛡️ 3. GENERAL LIMITER: For standard Login/Register
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2, // 2 attempts per 15 mins for login/register
  message: { error: "Too many requests. Please try again later." },
});

// 🚀 ROUTES
// Registration uses OTP limiter
router.post("/register", otpLimiter, authController.registerUser);
router.post("/verify-otp", otpLimiter, authController.verifyOTP);

// Login uses general/google limiters
router.post("/login", generalLimiter, authController.loginUser);
router.post("/google-login", googleLimiter, authController.googleLogin);

// Forgot Password uses OTP limiter
router.post("/forgot-password", otpLimiter, authController.requestPasswordReset);
router.post("/reset-password", otpLimiter, authController.resetPassword);

// Refresh is token-based (less prone to spam, high limit is fine)
router.post("/refresh", authController.refreshAccessToken);

// 🔒 BIOMETRIC ROUTES
router.post('/register-biometric', protect, authController.registerBiometric); 
router.post('/login-biometric', generalLimiter, authController.loginBiometric);

module.exports = router;