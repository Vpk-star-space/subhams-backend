const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendOTPEmail, sendWelcomeEmail } = require("../utils/emailService"); 
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ================= 1. GOOGLE LOGIN =================
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name } = ticket.getPayload();

    let userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    let user = userResult.rows[0];

    if (!user) {
      const newUser = await pool.query(
        "INSERT INTO users (username, email, password, auth_provider) VALUES ($1, $2, $3, $4) RETURNING *",
        [name, email, "google_authenticated", "google"]
      );
      user = newUser.rows[0];

      // Send welcome email with name
      sendWelcomeEmail(email, name).catch(err => console.error("Welcome email failed:", err));
    }

    await pool.query("UPDATE users SET last_active = NOW() WHERE id = $1", [user.id]);

    // 🚀 FIXED: Tokens now last 7 days
    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "30d" });

    res.json({ accessToken, refreshToken, user: { username: user.username, email: user.email } });

  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(400).json({ error: "Google authentication failed" });
  }
};

// ================= 2. REGISTER (SEND OTP) =================
const registerUser = async (req, res) => {
  try {
    let { email, username, password } = req.body;
    
    if (!email || !username || !password) {
      return res.status(400).json({ error: "Enter email, username, and password" });
    }

    email = email.toLowerCase().trim();
    username = username.toLowerCase().trim();

    const userExist = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR username = $2", 
      [email, username]
    );
    if (userExist.rows.length > 0) {
      return res.status(400).json({ error: "Email or Username already exists" });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query("DELETE FROM otps WHERE email = $1", [email]);

    await pool.query(
      "INSERT INTO otps (email, otp, expires_at) VALUES ($1, $2, $3)",
      [email, otp, expiresAt]
    );

    sendOTPEmail(email, otp).catch(err => console.error("OTP Email failed:", err));

    res.json({ message: "OTP sent! Please check your email." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during registration" });
  }
};

// ================= 3. VERIFY OTP & CREATE USER =================
const verifyOTP = async (req, res) => {
  try {
    let { email, username, password, otp } = req.body;

    if (!email || !username || !password || !otp) {
      return res.status(400).json({ error: "All fields are required" });
    }

    email = email.toLowerCase().trim();

    const otpRecord = await pool.query("SELECT * FROM otps WHERE email = $1", [email]);

    if (otpRecord.rows.length === 0) {
      return res.status(400).json({ error: "No OTP request found. Please register again." });
    }

    const validOtp = otpRecord.rows[0];

    if (validOtp.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP code." });
    }

    if (new Date(validOtp.expires_at) < new Date()) {
      await pool.query("DELETE FROM otps WHERE email = $1", [email]);
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query(
      "INSERT INTO users (email, username, password) VALUES ($1, $2, $3)",
      [email, username, hashedPassword]
    );

    await pool.query("DELETE FROM otps WHERE email = $1", [email]);

    // Send Welcome Email
    sendWelcomeEmail(email, username).catch(err => console.error("Welcome email failed:", err));

    res.json({ message: "Registration successful! You can now log in." });

  } catch (err) {
    if (err.code === '23505') {
        return res.status(400).json({ error: "Email or Username already taken." });
    }
    res.status(500).json({ error: "Server error during verification" });
  }
};

// ================= 4. LOGIN USER =================
const loginUser = async (req, res) => {
  try {
    let { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Enter username & password" });

    username = username.toLowerCase().trim();

    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // 🚀 FIXED: Tokens now last 7 days
    const accessToken = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "30d" }
    );

    await pool.query(
      "UPDATE users SET refresh_token = $1 WHERE id = $2",
      [refreshToken, user.id]
    );

    res.json({ accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= 5. REFRESH TOKEN =================
const refreshAccessToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ error: "Refresh token required" });

  try {
    const verified = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [verified.userId]);
    const user = result.rows[0];

    if (!user || user.refresh_token !== token) {
       return res.status(403).json({ error: "Invalid refresh token" });
    }

    // 🚀 FIXED: New Access Token lasts 7 days
    const newAccessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ error: "Token expired or invalid. Please log in again." });
  }
};

module.exports = { registerUser, loginUser, refreshAccessToken, verifyOTP, googleLogin};