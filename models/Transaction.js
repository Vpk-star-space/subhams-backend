const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  
  // 🚀 NEW: Category dropdown options
  category: { 
    type: String, 
    enum: ["Food", "Travel", "Salary", "Shopping", "Other"],
    default: "Other" 
  },
  
  // 🚀 NEW: Date selection
  date: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

module.exports = mongoose.model("Transaction", TransactionSchema);