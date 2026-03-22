const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access Denied" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: verified.userId }; // Matches how we signed it in loginUser
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid Token" });
  }
};