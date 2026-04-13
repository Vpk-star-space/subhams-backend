import React, { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const API = "https://subhams-backend.onrender.com/api";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const [transactions, setTransactions] = useState([]);
  const [monthlyChartData, setMonthlyChartData] = useState([]); 
  const [insights, setInsights] = useState(null); 
  
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [editingId, setEditingId] = useState(null);
  
  const [category, setCategory] = useState("Other");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [filterType, setFilterType] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [interestData, setInterestData] = useState({ principal: "", rate: "", time: "" });
  const [interestResult, setInterestResult] = useState({});

  // ================= AUTH =================
  const login = async () => {
    if (!username || !password) return alert("Enter details");
    try {
      const res = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (res.ok && data.token) { localStorage.setItem("token", data.token); setToken(data.token); } 
      else { alert(data.error || "Login failed"); }
    } catch (err) { alert("Backend server is offline."); }
  };

  const register = async () => {
    if (!username || !password) return alert("Enter details");
    try {
      const res = await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      if (res.ok) alert("Registered successfully! Now please login."); else alert("Registration failed");
    } catch (err) { alert("Backend server is offline."); }
  };

  const logout = () => { localStorage.removeItem("token"); setToken(null); setTransactions([]); setMonthlyChartData([]); setInsights(null); };

  // ================= FETCH DATA (FIXED GHOST TOKEN BUG) =================
  const fetchTransactions = useCallback(async () => {
    if (!token || token === "null" || token === "undefined") return;
    try {
      const res = await fetch(`${API}/transactions`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 400 || res.status === 401 || res.status === 403) { logout(); return; } // Auto-logout if token is bad
      const data = await res.json(); if (Array.isArray(data)) setTransactions(data);
    } catch (err) { console.error(err); }
  }, [token]);

  const fetchMonthlyData = useCallback(async () => {
    if (!token || token === "null" || token === "undefined") return;
    try {
      const res = await fetch(`${API}/transactions/monthly`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 400 || res.status === 401 || res.status === 403) return;
      const data = await res.json(); if (Array.isArray(data)) setMonthlyChartData(data);
    } catch (err) { console.error(err); }
  }, [token]);

  const fetchInsights = useCallback(async () => {
    if (!token || token === "null" || token === "undefined") return;
    try {
      const res = await fetch(`${API}/transactions/insights`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 400 || res.status === 401 || res.status === 403) return;
      const data = await res.json(); setInsights(data);
    } catch (err) { console.error(err); }
  }, [token]);

  useEffect(() => { fetchTransactions(); fetchMonthlyData(); fetchInsights(); }, [fetchTransactions, fetchMonthlyData, fetchInsights]);
// ================= ADD / UPDATE =================
  const handleSubmit = async (type) => {
    if (!title || !amount) return alert("Enter title & amount");
    const url = editingId ? `${API}/transactions/${editingId}` : `${API}/transactions`;
    const method = editingId ? "PUT" : "POST";
    try {
      const res = await fetch(url, { 
        method: method, 
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ title, amount: Number(amount), type, category, date }) 
      });
      
      if (res.ok) { 
        setTitle(""); setAmount(""); setEditingId(null); setCategory("Other"); 
        setDate(new Date().toISOString().split('T')[0]); 
        clearFilters(); fetchMonthlyData(); fetchInsights(); 
      } else { 
        // 🚀 THIS IS THE NEW DEBUG CODE
        const errData = await res.json();
        alert("BACKEND REJECTED THIS BECAUSE: " + errData.message); 
      }
    } catch (err) { 
      // 🚀 THIS IS THE NEW DEBUG CODE
      alert("CRITICAL ERROR: " + err.message); 
    }
  };
  const handleEdit = (t) => { setTitle(t.title); setAmount(t.amount); setEditingId(t._id); setCategory(t.category || "Other"); setDate(t.date ? t.date.substring(0, 10) : new Date().toISOString().split('T')[0]); };
  const cancelEdit = () => { setTitle(""); setAmount(""); setEditingId(null); setCategory("Other"); setDate(new Date().toISOString().split('T')[0]); };

  // ================= DELETE =================
  const deleteTransaction = async (id) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    try {
      const res = await fetch(`${API}/transactions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { fetchTransactions(); fetchMonthlyData(); fetchInsights(); } 
    } catch (err) { alert("Network Error."); }
  };

  // ================= FILTERS =================
  const applyFilters = async () => {
    try {
      const queryParams = new URLSearchParams({ type: filterType, category: filterCategory, startDate: filterStartDate, endDate: filterEndDate }).toString();
      const res = await fetch(`${API}/transactions/filter?${queryParams}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json(); if (Array.isArray(data)) setTransactions(data);
    } catch (err) { alert("Filter search failed."); }
  };
  const clearFilters = () => { setFilterType("All"); setFilterCategory("All"); setFilterStartDate(""); setFilterEndDate(""); fetchTransactions(); };

  // ================= CALCULATORS =================
  const calculateInterest = async () => {
    try {
      const res = await fetch(`${API}/transactions/interest`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(interestData) });
      const data = await res.json(); setInterestResult(data);
    } catch (err) { alert("Failed to calculate interest"); }
  };

  const income = transactions.filter(t => t.type === "income").reduce((a, b) => a + b.amount, 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((a, b) => a + b.amount, 0);
  const balance = income - expense;
  const pieData = [ { name: "Income", value: income }, { name: "Expense", value: expense } ];
  const chartColors = ["#10b981", "#ef4444"]; 

  // 🚀 BILINGUAL AI INSIGHT LOGIC (English + Telugu)
  let smartMessage = null;
  let smartMessageTe = null;
  let insightColor = "#3b82f6"; 
  let insightBg = "linear-gradient(90deg, #eff6ff 0%, #dbeafe 100%)";
  let insightEmoji = "💡";

  if (income > 0 || expense > 0) {
    if (income > 0 && expense === 0) {
      smartMessage = `Great start, ${username}! You are saving 100% of your ₹${income} income. Keep it up!`;
      smartMessageTe = `అద్భుతమైన ఆరంభం, ${username}! మీరు మీ ₹${income} ఆదాయాన్ని 100% ఆదా చేస్తున్నారు. ఇలాగే కొనసాగించండి!`;
      insightColor = "#10b981"; insightBg = "linear-gradient(90deg, #f0fdf4 0%, #dcfce7 100%)"; insightEmoji = "💰";
    } else if (expense > income && income > 0) {
      smartMessage = `Careful, ${username}! You've spent ₹${expense - income} more than you earned. Top drain: ${insights?.topCategory || "Other"}.`;
      smartMessageTe = `జాగ్రత్త, ${username}! మీరు సంపాదించిన దానికంటే ₹${expense - income} ఎక్కువ ఖర్చు చేశారు. అత్యధిక ఖర్చు: ${insights?.topCategory || "Other"}.`;
      insightColor = "#ef4444"; insightBg = "linear-gradient(90deg, #fef2f2 0%, #fee2e2 100%)"; insightEmoji = "⚠️";
    } else if (expense > 0 && income === 0) {
      smartMessage = `Heads up, ${username}! You've logged ₹${expense} in expenses but no income yet.`;
      smartMessageTe = `గమనిక, ${username}! మీరు ₹${expense} ఖర్చు చేశారు, కానీ ఇంకా ఎలాంటి ఆదాయం నమోదు చేయలేదు.`;
      insightColor = "#f59e0b"; insightBg = "linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)"; insightEmoji = "📉";
    } else if (income > 0 && expense > 0) {
      const spendPercent = Math.round((expense / income) * 100);
      if (spendPercent <= 20) {
        smartMessage = `Amazing, ${username}! You've only spent ${spendPercent}% of your income. You are building excellent savings!`;
        smartMessageTe = `అద్భుతం, ${username}! మీరు మీ ఆదాయంలో కేవలం ${spendPercent}% మాత్రమే ఖర్చు చేశారు. మీరు మంచి పొదుపు చేస్తున్నారు!`;
        insightColor = "#10b981"; insightBg = "linear-gradient(90deg, #f0fdf4 0%, #dcfce7 100%)"; insightEmoji = "🌟";
      } else if (spendPercent >= 80) {
        smartMessage = `Watch out, ${username}! You've spent ${spendPercent}% of your income. Try cutting back on ${insights?.topCategory || "Other"} (₹${insights?.amount || 0}).`;
        smartMessageTe = `జాగ్రత్త, ${username}! మీరు మీ ఆదాయంలో ${spendPercent}% ఖర్చు చేశారు. ${insights?.topCategory || "Other"} (₹${insights?.amount || 0}) ఖర్చును తగ్గించుకోవడానికి ప్రయత్నించండి.`;
        insightColor = "#f59e0b"; insightBg = "linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)"; insightEmoji = "🚨";
      } else {
        smartMessage = `Good pacing, ${username}. You've spent ${spendPercent}% of your income. Highest expense: ${insights?.topCategory || "Other"} (₹${insights?.amount || 0}).`;
        smartMessageTe = `పర్వాలేదు, ${username}. మీరు మీ ఆదాయంలో ${spendPercent}% ఖర్చు చేశారు. అత్యధిక ఖర్చు: ${insights?.topCategory || "Other"} (₹${insights?.amount || 0}).`;
        insightColor = "#3b82f6"; insightBg = "linear-gradient(90deg, #eff6ff 0%, #dbeafe 100%)"; insightEmoji = "📊";
      }
    }
  }

  // ================= STYLES =================
  const styles = {
    app: { fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", backgroundColor: "#f8fafc", minHeight: "100vh" },
    navbar: { backgroundColor: "#0f172a", color: "white", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    marqueeContainer: { backgroundColor: "#1e293b", color: "#fbbf24", padding: "10px", overflow: "hidden", whiteSpace: "nowrap" },
    marqueeText: { display: "inline-block", animation: "scrollLeft 30s linear infinite" },
    container: { maxWidth: "1100px", margin: "0 auto", padding: "20px" },
    card: { backgroundColor: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", marginBottom: "25px" },
    summaryBox: { display: "flex", justifyContent: "space-around", backgroundColor: "#f1f5f9", padding: "20px", borderRadius: "12px", fontWeight: "bold", fontSize: "1.2em", marginBottom: "25px", textAlign: "center" },
    insightBanner: { padding: "15px 20px", borderRadius: "8px", marginBottom: "25px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px", fontSize: "1.1em", borderLeft: "4px solid" },
    input: { padding: "12px", margin: "5px", border: "1px solid #cbd5e1", borderRadius: "6px", width: "calc(50% - 24px)", outline: "none", boxSizing: "border-box" },
    select: { padding: "12px", margin: "5px", border: "1px solid #cbd5e1", borderRadius: "6px", width: "calc(50% - 24px)", outline: "none", backgroundColor: "white" },
    filterSelect: { padding: "10px", margin: "5px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", backgroundColor: "white" },
    btn: { padding: "10px 15px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", color: "white", margin: "5px" },
    btnIncome: { backgroundColor: "#10b981" }, btnExpense: { backgroundColor: "#ef4444" }, btnNeutral: { backgroundColor: "#3b82f6" }, btnCancel: { backgroundColor: "#64748b" }, btnDanger: { backgroundColor: "#ef4444", padding: "6px 12px", fontSize: "0.85em" }, btnEdit: { backgroundColor: "#f59e0b", padding: "6px 12px", fontSize: "0.85em", marginRight: "8px" },
    listItem: { display: "flex", justifyContent: "space-between", padding: "15px", borderBottom: "1px solid #f1f5f9", alignItems: "center" },
    badge: { fontSize: "0.75em", padding: "3px 8px", borderRadius: "12px", backgroundColor: "#e2e8f0", color: "#475569", marginLeft: "10px", fontWeight: "bold" },
    dateText: { fontSize: "0.85em", color: "#94a3b8", display: "block", marginTop: "4px" },
    footer: { textAlign: "center", padding: "40px 20px", marginTop: "40px", color: "#64748b", backgroundColor: "white", borderTop: "1px solid #e2e8f0" },
    instagramBtn: { backgroundColor: "#e1306c", color: "white", padding: "10px 20px", borderRadius: "20px", textDecoration: "none", fontWeight: "bold", display: "inline-block", marginTop: "15px" }
  };

  // ================= UI RENDER =================
  if (!token || token === "null" || token === "undefined") return (
    <div style={{ ...styles.app, display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 20px" }}>
      {/* 🚀 BILINGUAL LOGIN CARD UPGRADE */}
      <div style={{ ...styles.card, width: "600px", textAlign: "center", padding: "40px" }}>
        <h1 style={{ color: "#0f172a", margin: "0 0 5px 0" }}>🏦 Subhams PMMS</h1>
        <h3 style={{ color: "#64748b", margin: "0 0 25px 0", fontWeight: "normal" }}>Personal Money Management System</h3>
        
        <div style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "8px", marginBottom: "30px", textAlign: "left", fontSize: "0.95em", color: "#334155", borderLeft: "4px solid #3b82f6" }}>
          <p style={{ margin: "0 0 15px 0", lineHeight: "1.5" }}><b>Hello everyone!</b> I am Subhams PMMS. In our busy lives, we often forget to track our daily income and expenses. My aim is to help you easily record and manage every transaction so you can secure your financial future.</p>
          <p style={{ margin: 0, lineHeight: "1.6", color: "#0f172a" }}><b>అందరికీ నమస్కారం!</b> శుభమ్స్ PMMS కు స్వాగతం. మన బిజీ జీవితంలో రోజువారీ ఆదాయం, ఖర్చులను ట్రాక్ చేయడం తరచుగా మర్చిపోతుంటాం. మీ ప్రతి లావాదేవీని సులభంగా రికార్డ్ చేసి, మీ ఆర్థిక భవిష్యత్తును సురక్షితం చేయడమే నా లక్ష్యం.</p>
          <b>Venkata Pavan Kumar</b>
        </div>

        <input style={{...styles.input, width: "80%"}} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input style={{...styles.input, width: "80%"}} placeholder="Strong Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /><br/><br/>
        <button style={{ ...styles.btn, ...styles.btnNeutral, width: "38%" }} onClick={login}>Login</button>
        <button style={{ ...styles.btn, backgroundColor: "#10b981", width: "38%" }} onClick={register}>Register</button>
      </div>
    </div>
  );

  return (
    <div style={styles.app}>
      <style>{`@keyframes scrollLeft { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }`}</style>
      <div style={styles.marqueeContainer}><div style={styles.marqueeText}>🚀 Important Note: Welcome to your Subhams Personal Money Management System! Track your income, manage your expenses, and secure your financial future ! Thank You visiting My website ! Venkata Pavan Kumar.</div></div>
      <nav style={styles.navbar}><h2 style={{ margin: 0 }}>Subhams</h2><button style={{ ...styles.btn, ...styles.btnExpense }} onClick={logout}>Logout</button></nav>

      <div style={styles.container}>
        
        {/* 🚀 BILINGUAL SUMMARY BOX */}
        <div style={styles.summaryBox}>
          <div>
            <div style={{ color: "#64748b", fontSize: "0.8em" }}>TOTAL INCOME <br/><span style={{fontSize: "1.3em", color: "#1e293b"}}>ఆదాయం</span></div>
            <div style={{ color: "#10b981", fontSize: "1.5em", marginTop: "5px" }}>₹{income}</div>
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "0.8em" }}>TOTAL EXPENSE <br/><span style={{fontSize: "1.3em", color: "#1e293b"}}>ఖర్చు</span></div>
            <div style={{ color: "#ef4444", fontSize: "1.5em", marginTop: "5px" }}>₹{expense}</div>
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "0.8em" }}>CURRENT BALANCE <br/><span style={{fontSize: "1.3em", color: "#1e293b"}}>నిల్వ</span></div>
            <div style={{ color: balance >= 0 ? "#3b82f6" : "#ef4444", fontSize: "1.5em", marginTop: "5px" }}>₹{balance}</div>
          </div>
        </div>

        {/* 🚀 BILINGUAL AI SMART INSIGHTS */}
        {smartMessage && (
          <div style={{ ...styles.insightBanner, background: insightBg, borderLeftColor: insightColor, color: insightColor }}>
            <div>{insightEmoji} &nbsp;<b>Subhams for You:</b> &nbsp;{smartMessage}</div>
            <div style={{ paddingLeft: "35px", fontSize: "0.95em", opacity: 0.9 }}><b>మీ కోసం శుభమ్స్:</b> &nbsp;{smartMessageTe}</div>
          </div>
        )}

        {(income > 0 || expense > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginBottom: "25px" }}>
            <div style={{ ...styles.card, flex: "1 1 400px", marginBottom: 0, paddingBottom: "20px" }}>
              <h3 style={{ margin: "0 0 10px 0", textAlign: "center" }}>📊 Overall Split</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => `₹${value}`} /><Legend /></PieChart>
              </ResponsiveContainer>
            </div>
            {monthlyChartData.length > 0 && (
              <div style={{ ...styles.card, flex: "1 1 500px", marginBottom: 0, paddingBottom: "20px" }}>
                <h3 style={{ margin: "0 0 10px 0", textAlign: "center" }}>📈 Monthly Trend</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(value) => `₹${value}`} /><Legend wrapperStyle={{ paddingTop: "20px" }} /><Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} /><Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} /></BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>{editingId ? "✏️ Edit Transaction" : "➕ Add New Transaction"}</h3>
          <input style={styles.input} placeholder="Title (e.g., Salary, Rent)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input style={styles.input} placeholder="Amount (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select style={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="Food">🍔 Food</option><option value="Travel">✈️ Travel</option><option value="Salary">💰 Salary</option><option value="Shopping">🛍️ Shopping</option><option value="Other">📌 Other</option>
          </select>
          <input style={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} /><br/><br/>
          <button style={{ ...styles.btn, ...styles.btnIncome }} onClick={() => handleSubmit("income")}>{editingId ? "Update as Income" : "Add Income"}</button>
          <button style={{ ...styles.btn, ...styles.btnExpense }} onClick={() => handleSubmit("expense")}>{editingId ? "Update as Expense" : "Add Expense"}</button>
          {editingId && <button style={{ ...styles.btn, ...styles.btnCancel }} onClick={cancelEdit}>Cancel</button>}
        </div>

        <div style={{ ...styles.card, backgroundColor: "#f8fafc" }}>
          <h3 style={{ marginTop: 0 }}>🔍 Search & Filter</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
            <select style={styles.filterSelect} value={filterType} onChange={(e) => setFilterType(e.target.value)}><option value="All">All Types</option><option value="income">Income Only</option><option value="expense">Expense Only</option></select>
            <select style={styles.filterSelect} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}><option value="All">All Categories</option><option value="Food">Food</option><option value="Travel">Travel</option><option value="Salary">Salary</option><option value="Shopping">Shopping</option><option value="Other">Other</option></select>
            <span style={{ fontSize: "0.9em" }}>From:</span><input style={styles.filterSelect} type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
            <span style={{ fontSize: "0.9em" }}>To:</span><input style={styles.filterSelect} type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
            <button style={{ ...styles.btn, ...styles.btnNeutral }} onClick={applyFilters}>Apply Filter</button>
            <button style={{ ...styles.btn, ...styles.btnCancel }} onClick={clearFilters}>Clear</button>
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>📜 Transaction History</h3>
          {transactions.length === 0 ? <p style={{ color: "#94a3b8", fontStyle: "italic" }}>No transactions match your search.</p> : null}
          {transactions.map((t) => (
            <div key={t._id} style={styles.listItem}>
              <div><b style={{ color: t.type === "income" ? "#10b981" : "#ef4444", fontSize: "1.2em" }}>{t.type === "income" ? "+ " : "- "}₹{t.amount}</b><span style={{ marginLeft: "15px", fontSize: "1.1em", color: "#334155" }}>{t.title}</span><span style={styles.badge}>{t.category || "Other"}</span><span style={styles.dateText}>📅 {t.date ? new Date(t.date).toLocaleDateString() : "No Date"}</span></div>
              <div><button style={{ ...styles.btn, ...styles.btnEdit }} onClick={() => handleEdit(t)}>Edit</button><button style={{ ...styles.btn, ...styles.btnDanger }} onClick={() => deleteTransaction(t._id)}>Delete</button></div>
            </div>
          ))}
        </div>

        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>🧮 Simple Interest Calculator</h3>
          <input style={styles.input} placeholder="Principal Amount (₹)" onChange={(e) => setInterestData({...interestData, principal: e.target.value})} />
          <input style={styles.input} placeholder="Rate of Interest (%)" onChange={(e) => setInterestData({...interestData, rate: e.target.value})} />
          <input style={styles.input} placeholder="Time (in months,ex 2years u enter 24 months)" onChange={(e) => setInterestData({...interestData, time: e.target.value})} /><br/><br/>
          <button style={{ ...styles.btn, ...styles.btnNeutral }} onClick={calculateInterest}>Calculate</button>
          {interestResult.interest !== undefined && (
            <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f0fdf4", borderLeft: "4px solid #10b981", borderRadius: "4px" }}><p style={{ margin: "5px 0" }}>Earned Interest: <b style={{ color: "#3b82f6", fontSize: "1.2em" }}>₹{interestResult.interest}</b></p><p style={{ margin: "5px 0" }}>Total Maturity Amount: <b style={{ color: "#10b981", fontSize: "1.2em" }}>₹{interestResult.total}</b></p></div>
          )}
        </div>
      </div>

      <footer style={styles.footer}>
        <p style={{ margin: "5px 0", fontWeight: "bold", color: "#475569" }}>Personal Money Management System</p>
        <p style={{ margin: "5px 0", fontSize: "0.9em" }}>Designed & Developed by</p><h3 style={{ margin: "10px 0", color: "#0f172a" }}>Venkata Pawan Kumar</h3>
       <a 
  href="mailto:pavanvenkat63@gmail.com" 
  style={styles.instagramBtn}
>
  📧 Contact via Email
</a>
<p style={styles.footerContact}>
                    Check out our other app: <a href="https://bhavyams-vendor-hub-vpk.vercel.app/" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>Bhavyams VendorHub</a>
                </p>
      </footer>
    </div>
  );
}

export default App;