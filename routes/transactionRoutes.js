const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/transactionController");

router.post("/", auth, ctrl.addTransaction);
router.get("/", auth, ctrl.getTransactions);
router.get("/filter", auth, ctrl.filterTransactions);
router.get("/monthly", auth, ctrl.getMonthlyData);
router.get("/insights", auth, ctrl.getInsights);
router.get("/summary", auth, ctrl.getSummary);
router.post("/interest", auth, ctrl.calculateInterest);

// THESE TWO LINES ARE CRITICAL FOR EDIT AND DELETE
router.put("/:id", auth, ctrl.updateTransaction);
router.delete("/:id", auth, ctrl.deleteTransaction);

module.exports = router;