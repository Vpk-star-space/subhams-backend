

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

// Helper function to talk to Brevo
const sendBrevoEmail = async (toEmail, subject, htmlContent) => {
  try {
    const response = await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: process.env.SENDER_EMAIL, name: "Subhams PMMS" },
        to: [{ email: toEmail }],
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Brevo Error:", errorData);
    }
  } catch (error) {
    console.error("Email sending failed:", error);
  }
};

// 🚀 1. The OTP Email Template
const sendOTPEmail = async (email, otp) => {
  const subject = "Your Subhams PMMS Verification Code";
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; color: #334155;">
      <h2 style="color: #0f172a;">Welcome to Subhams PMMS!</h2>
      <p>Here is your 6-digit verification code to complete your registration:</p>
      <h1 style="background-color: #f1f5f9; padding: 15px; letter-spacing: 5px; color: #f59e0b; border-radius: 8px; display: inline-block;">
        ${otp}
      </h1>
      <p style="color: #ef4444; font-size: 0.9em;">This code will expire in 5 minutes.</p>
    </div>
  `;
  await sendBrevoEmail(email, subject, html);
};

const sendWelcomeEmail = async (email, username) => {
  const subject = "Welcome to Subhams PMMS! | సుభమ్స్ కి స్వాగతం! 🎉";
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1e293b; line-height: 1.6;">
      <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
        <h1 style="color: #10b981; margin: 0;">Subhams PMMS</h1>
        <p style="font-style: italic; color: #64748b;">Your Personal Money Management Suite</p>
      </div>

      <div style="padding: 20px 0;">
        <h2 style="color: #0f172a;">Hello ${username || 'User'},</h2>
        
        <p><b>English:</b> Your account is verified! Start tracking your daily income and expenses to secure your financial future.</p>
        
        <p style="font-size: 1.1em; color: #059669;">
          <b>తెలుగు:</b> మీ ఖాతా విజయవంతంగా ధృవీకరించబడింది! మీ ఆర్థిక భవిష్యత్తును సురక్షితం చేసుకోవడానికి మీ రోజువారీ ఆదాయం మరియు ఖర్చులను ట్రాక్ చేయడం ప్రారంభించండి.
        </p>
      </div>

      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
        <p style="margin: 0;"><b>Founder's Note:</b> "Control your money, or it will control you."</p>
        <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #64748b;">— Venkata Pavan Kumar</p>
      </div>

      <div style="margin-top: 30px; font-size: 0.8em; color: #94a3b8; text-align: center;">
        &copy; 2026 Subhams. All rights reserved.
      </div>
    </div>
  `;
  await sendBrevoEmail(email, subject, html);
};
const sendInactivityInsight = async (email, username, summary) => {
  const subject = "Subhams Insights: Your Financial Snapshot | మీ ఆర్థిక వివరాలు 📊";
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px;">
      <h2 style="color: #10b981;">Subhams for You...</h2>
      <p>Hello ${username}, we noticed you've been away. Here is your current status:</p>
      
      <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><b>Total Income:</b> ₹${summary.income}</p>
        <p><b>Total Expenses:</b> ₹${summary.expense}</p>
        <hr>
        <p style="font-size: 1.2em;"><b>Balance:</b> <span style="color: #10b981;">₹${summary.balance}</span></p>
      </div>

      <p style="color: #059669; font-weight: bold;">
        తెలుగు: మీ ఖాతాలో ప్రస్తుతం ₹${summary.balance} బ్యాలెన్స్ ఉంది. మీ ఖర్చులను ట్రాక్ చేయడం మర్చిపోవద్దు!
      </p>

      <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; font-size: 0.9em; color: #64748b;">
        Stay disciplined. Stay wealthy. - Subhams Team
      </div>
    </div>
  `;
  await sendBrevoEmail(email, subject, html);
};

// Update your exports
module.exports = { sendOTPEmail, sendWelcomeEmail, sendInactivityInsight };