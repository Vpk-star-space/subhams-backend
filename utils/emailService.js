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

// 🚀 1. The OTP Email Template (Beautiful & Bilingual)
const sendOTPEmail = async (email, otp) => {
  const subject = "Your Subhams Verification Code | మీ వెరిఫికేషన్ కోడ్ 🔐";
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; padding: 20px; text-align: center;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        
        <div style="background-color: #0f172a; padding: 20px;">
          <h1 style="margin: 0; color: #facc15; font-size: 28px; font-weight: 900; letter-spacing: -1px;">Subhams</h1>
          <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 13px;">Personal Money Management System</p>
        </div>

        <div style="padding: 30px 20px;">
          <h2 style="color: #1e293b; margin-top: 0;">Welcome to Subhams!</h2>
          <p style="color: #64748b; font-size: 15px; margin-bottom: 5px;">Here is your 6-digit verification code:</p>
          <p style="color: #64748b; font-size: 13px; margin-top: 0;">మీ 6-అంకెల వెరిఫికేషన్ కోడ్ కింద ఉంది:</p>
          
          <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 15px; margin: 20px 0; border-radius: 12px;">
            <h1 style="margin: 0; color: #10b981; letter-spacing: 8px; font-size: 32px;">${otp}</h1>
          </div>
          
          <p style="color: #ef4444; font-size: 13px; font-weight: bold;">This code will expire in 5 minutes. / ఈ కోడ్ 5 నిమిషాల్లో ముగుస్తుంది.</p>
        </div>

        <div style="background-color: #f8fafc; padding: 15px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Designed & Developed by Venkata Pavan Kumar
        </div>
      </div>
    </div>
  `;
  await sendBrevoEmail(email, subject, html);
};

// 🚀 2. Welcome Email (Professional SaaS Design)
const sendWelcomeEmail = async (email, username) => {
  const subject = "Welcome to Subhams PMMS! | సుభమ్స్ కి స్వాగతం! 🎉";
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        
        <div style="background-color: #0f172a; padding: 20px; text-align: center;">
          <h1 style="margin: 0; color: #facc15; font-size: 28px; font-weight: 900; letter-spacing: -1px;">Subhams</h1>
        </div>

        <div style="padding: 30px 20px;">
          <h2 style="color: #1e293b; margin-top: 0;">Hello ${username || 'User'},</h2>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            <b>English:</b> Your account is successfully verified! You can now start tracking your daily income and expenses to secure your financial future.
          </p>
          
          <p style="color: #10b981; font-size: 15px; line-height: 1.6; font-weight: bold; background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
            తెలుగు: మీ ఖాతా విజయవంతంగా ధృవీకరించబడింది! మీ ఆర్థిక భవిష్యత్తును సురక్షితం చేసుకోవడానికి మీ రోజువారీ ఆదాయం మరియు ఖర్చులను ట్రాక్ చేయడం ప్రారంభించండి.
          </p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 25px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #334155; font-style: italic;">"Control your money, or it will control you."</p>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #64748b; font-weight: bold;">— Founder, Venkata Pavan Kumar</p>
          </div>
        </div>
      </div>
    </div>
  `;
  await sendBrevoEmail(email, subject, html);
};

// 🚀 3. Transaction Update Email (Matches your App UI exactly)
const sendInactivityInsight = async (email, username, summary) => {
  const subject = "Subhams PMMS: Transaction Saved Successfully! 📊";
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        
        <div style="background-color: #0f172a; padding: 20px; text-align: center;">
          <h1 style="margin: 0; color: #facc15; font-size: 28px; font-weight: 900; letter-spacing: -1px;">Subhams</h1>
          <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 13px;">Financial Update Dashboard</p>
        </div>

        <div style="padding: 30px 20px;">
          <h3 style="color: #1e293b; margin-top: 0; text-align: center;">Transaction Successful! ✅</h3>
          <p style="color: #64748b; font-size: 14px; text-align: center; margin-bottom: 25px;">
            Hello <b>${username}</b>, your latest transaction has been safely recorded. Here is your updated financial snapshot:
          </p>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 25px; text-align: center;">
            <tr>
              <td style="padding: 15px 10px; width: 33%;">
                <div style="font-size: 10px; color: #64748b; font-weight: bold; margin-bottom: 5px;">INCOME <br/> ఆదాయం</div>
                <div style="color: #10b981; font-weight: 900; font-size: 18px;">₹${summary.income}</div>
              </td>
              <td style="padding: 15px 10px; width: 33%; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                <div style="font-size: 10px; color: #64748b; font-weight: bold; margin-bottom: 5px;">EXPENSE <br/> ఖర్చు</div>
                <div style="color: #ef4444; font-weight: 900; font-size: 18px;">₹${summary.expense}</div>
              </td>
              <td style="padding: 15px 10px; width: 33%;">
                <div style="font-size: 10px; color: #64748b; font-weight: bold; margin-bottom: 5px;">BALANCE <br/> నిల్వ</div>
                <div style="color: #3b82f6; font-weight: 900; font-size: 18px;">₹${summary.balance}</div>
              </td>
            </tr>
          </table>

          <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
              <b>Telugu Update:</b> మీ లావాదేవీ విజయవంతంగా సేవ్ చేయబడింది. మీ ఖాతాలో ప్రస్తుతం <b>₹${summary.balance}</b> బ్యాలెన్స్ ఉంది.
            </p>
          </div>
        </div>

        <div style="background-color: #f8fafc; padding: 15px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0;">
          Stay disciplined. Stay wealthy. - Subhams PMMS
        </div>
      </div>
    </div>
  `;
  await sendBrevoEmail(email, subject, html);
};

module.exports = { sendOTPEmail, sendWelcomeEmail, sendInactivityInsight };