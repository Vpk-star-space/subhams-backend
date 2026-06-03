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
   const uniqueId = Date.now(); 
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
  
  // 🟢 Gmail anti-clipping fix
  const uniqueId = Date.now(); 

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #334155;">
      <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        
        <!-- 🟢 Premium Gradient Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 35px 20px; text-align: center;">
          <h1 style="margin: 0; color: #f59e0b; font-size: 32px; font-weight: 900; letter-spacing: -1px;">SUBHAMS</h1>
          <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Personal Money Management</p>
        </div>

        <div style="padding: 40px 30px;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">Hello ${username || 'User'}, welcome aboard! 🚀</h2>
          
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            We are thrilled to have you! Your account is fully verified. You are now equipped with the ultimate tool to track your daily income, manage your expenses, and secure your financial future.
          </p>
          
          <!-- 🟢 Beautiful Bilingual Highlight Box -->
          <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; border-left: 5px solid #10b981; margin-bottom: 30px;">
            <p style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.6; font-weight: bold;">
              తెలుగు: మీ ఖాతా విజయవంతంగా ధృవీకరించబడింది! మీ ఆర్థిక భవిష్యత్తును సురక్షితం చేసుకోవడానికి మీ రోజువారీ ఆదాయం మరియు ఖర్చులను ట్రాక్ చేయడం ప్రారంభించండి.
            </p>
          </div>

          <!-- 🟢 Feature Showcase -->
          <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 15px;">What you can do right now:</h3>
          <ul style="padding: 0; margin: 0 0 35px 0; list-style: none;">
            <li style="margin-bottom: 15px; font-size: 15px; color: #475569; display: flex; align-items: center;">
              <span style="background: #eff6ff; color: #3b82f6; padding: 6px 8px; border-radius: 8px; margin-right: 12px; font-size: 14px;">📊</span> <b>Track Finances:</b> Add daily incomes and pending expenses.
            </li>
            <li style="margin-bottom: 15px; font-size: 15px; color: #475569; display: flex; align-items: center;">
              <span style="background: #eff6ff; color: #3b82f6; padding: 6px 8px; border-radius: 8px; margin-right: 12px; font-size: 14px;">📄</span> <b>Export Data:</b> Download official PDF White Papers of your history.
            </li>
            <li style="margin-bottom: 15px; font-size: 15px; color: #475569; display: flex; align-items: center;">
              <span style="background: #eff6ff; color: #3b82f6; padding: 6px 8px; border-radius: 8px; margin-right: 12px; font-size: 14px;">🔒</span> <b>Stay Secure:</b> Lock your app to your device using Biometrics.
            </li>
          </ul>
          
          <!-- 🟢 Professional Founder Signature -->
          <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; border: 1px dashed #cbd5e1; text-align: center;">
            <p style="margin: 0; color: #334155; font-style: italic; font-size: 16px;">"Control your money, or it will control you."</p>
            <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              <p style="margin: 0; font-size: 15px; color: #0f172a; font-weight: 900;">A. Venkata Pavan Kumar</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Founder & Lead Engineer</p>
            </div>
          </div>
        </div>

        <!-- 🟢 Secure Footer with Unique ID -->
        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: bold;">Subhams PMMS</p>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} All Rights Reserved.</p>
          <span style="display: none; color: transparent; font-size: 0px;">&nbsp;[ID: ${uniqueId}]</span>
        </div>

      </div>
    </div>
  `;
  await sendBrevoEmail(email, subject, html);
};

// 🚀 3. Transaction Update Email (Matches your App UI exactly)
const sendInactivityInsight = async (email, username, summary) => {
  const subject = "Subhams PMMS: Transaction Saved Successfully! 📊";
  
  // 🟢 This generates a unique random number every time the email sends.
  // We hide this in the footer so Gmail NEVER clips or hides your text again!
  const uniqueId = Date.now(); 

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; padding: 20px;">
      <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        
        <div style="background-color: #0f172a; padding: 20px; text-align: center;">
          <h1 style="margin: 0; color: #facc15; font-size: 28px; font-weight: 900; letter-spacing: -1px;">Subhams</h1>
          <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 13px;">Financial Update Dashboard</p>
        </div>

        <div style="padding: 30px 20px;">
          <h3 style="color: #1e293b; margin-top: 0; text-align: center;">Transaction Successful! ✅</h3>
          <p style="color: #64748b; font-size: 14px; text-align: center; margin-bottom: 25px;">
            Hello <b>${username}</b>, your latest transaction has been safely recorded. Here is your updated financial snapshot:
          </p>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px; text-align: center;">
            <tr>
              <td style="padding: 15px 5px; width: 25%;">
                <div style="font-size: 10px; color: #64748b; font-weight: bold; margin-bottom: 5px;">INCOME <br/> ఆదాయం</div>
                <div style="color: #10b981; font-weight: 900; font-size: 16px;">₹${summary.income}</div>
              </td>
              <td style="padding: 15px 5px; width: 25%; border-left: 1px solid #e2e8f0;">
                <div style="font-size: 10px; color: #64748b; font-weight: bold; margin-bottom: 5px;">EXPENSE <br/> ఖర్చు</div>
                <div style="color: #ef4444; font-weight: 900; font-size: 16px;">₹${summary.expense}</div>
              </td>
              <td style="padding: 15px 5px; width: 25%; border-left: 1px solid #e2e8f0;">
                <div style="font-size: 10px; color: #64748b; font-weight: bold; margin-bottom: 5px;">PENDING <br/> పెండింగ్</div>
                <div style="color: #f59e0b; font-weight: 900; font-size: 16px;">₹${summary.pending}</div>
              </td>
              <td style="padding: 15px 5px; width: 25%; border-left: 1px solid #e2e8f0;">
                <div style="font-size: 10px; color: #64748b; font-weight: bold; margin-bottom: 5px;">BALANCE <br/> నిల్వ</div>
                <div style="color: #3b82f6; font-weight: 900; font-size: 16px;">₹${summary.balance}</div>
              </td>
            </tr>
          </table>

          <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
              <b>Telugu Update:</b> మీ లావాదేవీ విజయవంతంగా సేవ్ చేయబడింది. మీ ఖాతాలో ప్రస్తుతం <b>₹${summary.balance}</b> బ్యాలెన్స్ ఉంది.
            </p>
          </div>

          <!-- 🟢 UPDATED: Current Feature Highlight Box -->
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px dashed #cbd5e1; margin-top: 25px; text-align: center;">
            <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.6;">
              🚀 <b>Feature Highlight:</b> You can easily download your complete history or individual transactions in PDF format directly from your dashboard! You can also share specific transactions to yourself or others, making it simple to manage your financial records.
            </p>
          </div>
        </div>

        <!-- 🟢 UPDATED: Gmail clipping fix! The span is invisible but makes the email unique -->
        <div style="background-color: #f1f5f9; padding: 15px; font-size: 13px; color: #475569; font-weight: bold; text-align: center; border-top: 1px solid #e2e8f0;">
          Stay disciplined. Stay wealthy. - Subhams PMMS
          <span style="display: none; color: transparent; font-size: 0px;">&nbsp;[ID: ${uniqueId}]</span>
        </div>
      </div>
    </div>
  `;
  await sendBrevoEmail(email, subject, html);
};

module.exports = { sendOTPEmail, sendWelcomeEmail, sendInactivityInsight };