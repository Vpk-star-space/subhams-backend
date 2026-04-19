const jwt = require("jsonwebtoken");
const pool = require("../config/db");

module.exports = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access Denied: No Token Provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: verified.userId }; 

    // 🚀 UPDATED: Silent update of last_active. 
    // We use a try/catch here so if the DB is sleepy, the user can still use the app.
    pool.query("UPDATE users SET last_active = NOW() WHERE id = $1", [verified.userId])
        .catch(err => console.log("Middleware: Could not update last_active"));

    next();
    
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      // This sends the specific code your frontend needs to see
      return res.status(401).json({ message: "Token Expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(403).json({ message: "Invalid Token" });
  }
};