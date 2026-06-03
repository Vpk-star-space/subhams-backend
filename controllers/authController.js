const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendOTPEmail, sendWelcomeEmail } = require("../utils/emailService"); 
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ================= REGISTER BIOMETRIC KEY =================
const registerBiometric = async (req, res) => {
  try {
    const { credentialId } = req.body;
    const userId = req.user.userId;

    if (!credentialId) return res.status(400).json({ error: "Missing biometric credential data." });

    await pool.query("UPDATE users SET biometric_key = $1 WHERE id = $2", [credentialId, userId]);
    res.json({ message: "Biometric authentication linked successfully! 🔒" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= LOGIN WITH BIOMETRIC KEY =================
const loginBiometric = async (req, res) => {
  try {
    let { credentialId, username } = req.body;
    username = username.toLowerCase().trim();

    const userRes = await pool.query("SELECT id, username, biometric_key FROM users WHERE LOWER(TRIM(username)) = $1", [username]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found. Please log in with password first." });

    const user = userRes.rows[0];

    if (!user.biometric_key || user.biometric_key !== credentialId) {
      return res.status(401).json({ error: "Biometric verification failed. Unrecognized device." });
    }

    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '30d' });

    await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [refreshToken, user.id]);

    res.json({ message: "Welcome back! Unlocked via Biometrics.", accessToken, refreshToken, user: { id: user.id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= 1. GOOGLE LOGIN =================
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name } = ticket.getPayload();
    const cleanEmail = email.toLowerCase().trim();

    let userResult = await pool.query("SELECT * FROM users WHERE LOWER(TRIM(email)) = $1", [cleanEmail]);
    let user = userResult.rows[0];

    if (!user) {
      const safeUsername = cleanEmail.split("@")[0]; 
      const newUser = await pool.query(
        "INSERT INTO users (username, email, password, auth_provider, login_attempts, block_until) VALUES ($1, $2, $3, $4, 0, NULL) RETURNING *",
        [safeUsername, cleanEmail, "google_authenticated", "google"]
      );
      user = newUser.rows[0];
    } else {
      await pool.query(
        "UPDATE users SET auth_provider = 'google', password = 'google_authenticated', login_attempts = 0, block_until = NULL WHERE id = $1", 
        [user.id]
      );
      userResult = await pool.query("SELECT * FROM users WHERE id = $1", [user.id]);
      user = userResult.rows[0];
    }

    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "30d" });

    await pool.query("UPDATE users SET last_active = NOW(), refresh_token = $1 WHERE id = $2", [refreshToken, user.id]);

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
    
    if (!email || !username || !password) return res.status(400).json({ error: "Enter email, username, and password" });

    email = email.toLowerCase().trim();
    username = username.toLowerCase().trim();

    const userExist = await pool.query("SELECT * FROM users WHERE LOWER(TRIM(email)) = $1 OR LOWER(TRIM(username)) = $2", [email, username]);
    if (userExist.rows.length > 0) return res.status(400).json({ error: "Email or Username already exists" });

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query("DELETE FROM otps WHERE LOWER(TRIM(email)) = $1", [email]);
    await pool.query("INSERT INTO otps (email, otp, expires_at) VALUES ($1, $2, $3)", [email, otp, expiresAt]);

    try {
      await sendOTPEmail(email, otp);
      return res.json({ message: "OTP sent! Please check your email." });
    } catch (err) {
      console.error("OTP Email failed:", err);
      await pool.query("DELETE FROM otps WHERE LOWER(TRIM(email)) = $1", [email]); 
      return res.status(500).json({ error: "Email provider blocked the request. Please check Brevo IP settings." });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during registration" });
  }
};

// ================= 3. VERIFY OTP & CREATE USER =================
const verifyOTP = async (req, res) => {
  try {
    let { email, username, password, otp } = req.body;

    if (!email || !username || !password || !otp) return res.status(400).json({ error: "All fields are required" });

    email = email.toLowerCase().trim();
    username = username.toLowerCase().trim();
    password = password.trim(); 

    const otpRecord = await pool.query("SELECT * FROM otps WHERE LOWER(TRIM(email)) = $1", [email]);

    if (otpRecord.rows.length === 0) return res.status(400).json({ error: "No OTP request found. Please register again." });

    const validOtp = otpRecord.rows[0];
    if (validOtp.otp !== otp) return res.status(400).json({ error: "Invalid OTP code." });

    if (new Date(validOtp.expires_at) < new Date()) {
      await pool.query("DELETE FROM otps WHERE LOWER(TRIM(email)) = $1", [email]);
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query("INSERT INTO users (email, username, password) VALUES ($1, $2, $3)", [email, username, hashedPassword]);
    await pool.query("DELETE FROM otps WHERE LOWER(TRIM(email)) = $1", [email]);

    try { await sendWelcomeEmail(email, username); } catch (err) { console.error("Welcome email failed:", err); }

    res.json({ message: "Registration successful! You can now log in." });

  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: "Email or Username already taken." });
    res.status(500).json({ error: "Server error during verification" });
  }
};

// ================= 4. LOGIN USER =================
const loginUser = async (req, res) => {
  try {
    let { username, password } = req.body;
    
    console.log("\n=== 🕵️‍♂️ LOGIN DEBUG TRACKER START ===");
    console.log("1. User typed Username:", username);
    console.log("2. User typed Password length:", password ? password.length : "UNDEFINED");

    if (!username || !password) return res.status(400).json({ error: "Enter username & password" });

    username = username.toLowerCase().trim();
    const plainTextPassword = password.trim(); 

    const result = await pool.query("SELECT * FROM users WHERE LOWER(TRIM(username)) = $1 OR LOWER(TRIM(email)) = $1", [username]);
    
    console.log("3. Did the database find the user?:", result.rows.length > 0);

    if (result.rows.length === 0) {
        console.log("❌ CRASH POINT: User does not exist in the database!");
        console.log("=== 🕵️‍♂️ LOGIN DEBUG TRACKER END ===\n");
        return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    
    console.log("4. User Data found in Database:");
    console.log("   - Username:", user.username);
    console.log("   - Email:", user.email);
    console.log("   - Password Hash:", user.password);
    console.log("   - Lockout Time:", user.block_until);

    if (user.block_until && new Date(user.block_until) > new Date()) {
        console.log("❌ CRASH POINT: User is currently locked out by the database.");
        const remainingMins = Math.ceil((new Date(user.block_until) - new Date()) / 60000);
        console.log("=== 🕵️‍♂️ LOGIN DEBUG TRACKER END ===\n");
        return res.status(429).json({ error: `Account locked for security. Try again in ${remainingMins} minutes.` });
    }

    const isGoogleUser = user.auth_provider === 'google' || user.password === 'google_authenticated' || !(user.password || "").startsWith('$2');
    console.log("5. Is this a Google-only account?:", isGoogleUser);
    
    if (isGoogleUser) {
      console.log("❌ CRASH POINT: Tried to use a password on a Google account.");
      console.log("=== 🕵️‍♂️ LOGIN DEBUG TRACKER END ===\n");
      return res.status(400).json({ error: "You signed up with Google. Please click the Google Login button below." });
    }

    const dbHash = (user.password || "").trim();
    
    console.log("6. Running Bcrypt Compare...");
    const isMatch = await bcrypt.compare(plainTextPassword, dbHash);
    
    console.log("7. Did the password match the hash?:", isMatch);

    if (!isMatch) {
        console.log("❌ CRASH POINT: Bcrypt says the password is WRONG.");
        const newAttempts = (user.login_attempts || 0) + 1;
        
        if (newAttempts >= 5) {
            console.log("⚠️ TRIGGERING DATABASE LOCKOUT NOW.");
            await pool.query("UPDATE users SET login_attempts = $1, block_until = NOW() + INTERVAL '15 minutes' WHERE id = $2", [newAttempts, user.id]);
            console.log("=== 🕵️‍♂️ LOGIN DEBUG TRACKER END ===\n");
            return res.status(429).json({ error: "Too many failed attempts. Account locked for 15 minutes." });
        }
        
        await pool.query("UPDATE users SET login_attempts = $1 WHERE id = $2", [newAttempts, user.id]);
        console.log("=== 🕵️‍♂️ LOGIN DEBUG TRACKER END ===\n");
        return res.status(400).json({ error: `Invalid credentials. ${5 - newAttempts} attempt(s) left.` });
    }

    console.log("✅ SUCCESS: Everything matched! Unlocking and sending tokens.");
    await pool.query("UPDATE users SET login_attempts = 0, block_until = NULL WHERE id = $1", [user.id]);

    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "30d" });

    await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [refreshToken, user.id]);

    console.log("=== 🕵️‍♂️ LOGIN DEBUG TRACKER END ===\n");
    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error during login." });
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

    if (!user || user.refresh_token !== token) return res.status(403).json({ error: "Invalid refresh token" });

    const newAccessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ error: "Token expired or invalid. Please log in again." });
  }
};

// ================= 6. FORGOT PASSWORD =================
const requestPasswordReset = async (req, res) => {
  try {
    let { email } = req.body;
    if (!email) return res.status(400).json({ error: "Please provide your email address." });

    email = email.toLowerCase().trim();
    
    // 🟢 BUG FIX: LOWER(TRIM()) to catch accounts that were saved with spaces
    const userRes = await pool.query("SELECT * FROM users WHERE LOWER(TRIM(email)) = $1", [email]);
    
    if (userRes.rows.length === 0) return res.status(404).json({ error: "No account found with this email." });

    const user = userRes.rows[0];

    const isGoogleUser = user.auth_provider === 'google' || 
                         user.password === 'google_authenticated' || 
                         (user.password && !user.password.startsWith('$2'));

    if (isGoogleUser) {
      return res.status(400).json({ error: "This account is linked to Google. Please use Google Login instead." });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query("DELETE FROM otps WHERE LOWER(TRIM(email)) = $1", [email]);
    await pool.query("INSERT INTO otps (email, otp, expires_at) VALUES ($1, $2, $3)", [email, otp, expiresAt]);

    await sendOTPEmail(email, otp);
    return res.json({ message: "Password reset OTP sent to your email!" });

  } catch (err) { 
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error." }); 
  }
};

// ================= 7. RESET PASSWORD =================
const resetPassword = async (req, res) => {
  try {
    let { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: "All fields are required." });

    email = email.toLowerCase().trim();
    newPassword = newPassword.trim();

    const otpRecord = await pool.query("SELECT * FROM otps WHERE LOWER(TRIM(email)) = $1", [email]);
    if (otpRecord.rows.length === 0) return res.status(400).json({ error: "No OTP request found." });

    const validOtp = otpRecord.rows[0];
    
    if (validOtp.otp !== otp) return res.status(400).json({ error: "Invalid OTP code." });
    
    if (new Date(validOtp.expires_at) < new Date()) {
      await pool.query("DELETE FROM otps WHERE LOWER(TRIM(email)) = $1", [email]);
      return res.status(400).json({ error: "OTP has expired." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 🟢 BUG FIX: LOWER(TRIM()) ensures the database ACTUALLY wipes the lock!
    await pool.query(
        "UPDATE users SET password = $1, login_attempts = 0, block_until = NULL WHERE LOWER(TRIM(email)) = $2", 
        [hashedPassword, email]
    );
    await pool.query("DELETE FROM otps WHERE LOWER(TRIM(email)) = $1", [email]);

    res.json({ message: "Password successfully reset! You can now log in." });
  } catch (err) { 
    console.error("PASSWORD RESET ERROR:", err); 
    res.status(500).json({ error: "Server error. Please try again later." }); 
  }
};

module.exports = { 
  registerUser, loginUser, refreshAccessToken, verifyOTP, googleLogin, registerBiometric, loginBiometric, requestPasswordReset, resetPassword 
};