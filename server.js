require("dotenv").config(); // 🚨 THIS WAS MISSING! It MUST be line 1.
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"], credentials: true }));
app.use(express.json());

// 🕵️ THE TRACKER: This will print every single click to your terminal
app.use((req, res, next) => {
  console.log(`➡️ Incoming Request: ${req.method} ${req.url}`);
  next();
});

connectDB();

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/transactions", require("./routes/transactionRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));