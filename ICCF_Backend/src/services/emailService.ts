import nodemailer from 'nodemailer';

interface SendOtpOptions {
  toEmail: string;
  studentName?: string;
  otp: string;
}

export async function sendOtpEmail({ toEmail, studentName = 'Student', otp }: SendOtpOptions): Promise<{ success: boolean; message: string; provider?: string }> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  const resendApiKey = process.env.RESEND_API_KEY;
  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM || smtpUser || 'onboarding@resend.dev';
  const senderName = process.env.EMAIL_FROM_NAME || 'Manav Rachna ICCF Portal';


  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ICCF Student Login Code</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2; margin: 0; padding: 24px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #ECE7DF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(139, 21, 40, 0.08);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8B1528 0%, #5E0D1B 100%); padding: 32px 24px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 1.45rem; font-weight: 800; letter-spacing: -0.02em;">
            Manav Rachna University
          </h1>
          <p style="margin: 6px 0 0; opacity: 0.9; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase;">
            Institutional Competency Certification Framework (ICCF)
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 36px 32px; background-color: #FFFFFF;">
          <p style="font-size: 1.05rem; color: #1C1917; margin-top: 0;">
            Dear <strong>${studentName}</strong>,
          </p>
          <p style="color: #57534E; font-size: 0.92rem; line-height: 1.6; margin-bottom: 24px;">
            A sign-in request was initiated for your student competency portal. Use the following 6-digit one-time verification code (OTP) to securely complete your login:
          </p>

          <!-- OTP Box -->
          <div style="text-align: center; margin: 28px 0; padding: 20px; background-color: #FAF8F5; border: 2px dashed #D6D3D1; border-radius: 16px;">
            <div style="font-size: 0.76rem; font-weight: 700; color: #78716C; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
              Your 6-Digit Verification Code
            </div>
            <span style="font-family: 'Courier New', monospace; font-size: 2.3rem; font-weight: 800; letter-spacing: 0.35em; color: #8B1528; display: inline-block;">
              ${otp}
            </span>
          </div>

          <p style="color: #78716C; font-size: 0.82rem; line-height: 1.5; margin-bottom: 8px;">
            ⏳ This code is valid for <strong>10 minutes</strong>. If you did not request this verification code, please ignore this email or notify university IT administration.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #FAF7F2; padding: 18px 24px; text-align: center; font-size: 0.74rem; color: #A8A29E; border-top: 1px solid #ECE7DF;">
          Manav Rachna University • Sector 43, Aravalli Hills, Faridabad, Haryana<br>
          Established under Section 2(f) of UGC Act 1956
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. Try Standard Gmail / Google Workspace SMTP (100% Free, Zero Payment/Card Required)
  if (smtpUser && smtpPass) {
    try {
      const isGmail = smtpHost.includes('gmail');
      const transporter = isGmail
        ? nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: smtpUser,
              pass: smtpPass.replace(/\s+/g, ''),
            },
            tls: {
              rejectUnauthorized: false
            }
          })
        : nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass.replace(/\s+/g, ''),
            },
            tls: {
              rejectUnauthorized: false
            }
          });

      await transporter.sendMail({
        from: `"${senderName}" <${smtpUser}>`,
        to: toEmail,
        subject: `🔐 ${otp} is your Manav Rachna ICCF Login Code`,
        html: htmlContent,
      });

      console.log(`[SMTP Mailer SUCCESS] Real-time OTP email delivered to ${toEmail} via Gmail SMTP`);
      return { success: true, message: `Real-time OTP email sent via SMTP to ${toEmail}`, provider: 'SMTP' };
    } catch (err: any) {
      console.error(`[SMTP Delivery ERROR for ${toEmail}]:`, err.message);
    }
  }

  // 2. Try Resend Cloud API (if key is set)
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${senderName} <${senderEmail}>`,
          to: [toEmail],
          subject: `🔐 ${otp} is your Manav Rachna ICCF Login Code`,
          html: htmlContent
        })
      });

      const resData: any = await response.json();
      if (response.ok) {
        console.log(`[Resend API] Real-time OTP email delivered to ${toEmail} (ID: ${resData?.id})`);
        return { success: true, message: `Real-time OTP email sent via Resend to ${toEmail}`, provider: 'Resend' };
      } else if (resData?.statusCode === 403 && resData?.message?.includes('testing emails to your own email address')) {
        const match = resData.message.match(/\(([^)]+)\)/);
        const devRecipient = match ? match[1] : null;
        if (devRecipient) {
          console.log(`[Resend Sandbox] Delivering real-time email to your verified test inbox: ${devRecipient}...`);
          const testResp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: `${senderName} <${senderEmail}>`,
              to: [devRecipient],
              subject: `🔐 [For ${toEmail}] ${otp} is your ICCF Portal Code`,
              html: htmlContent
            })
          });
          const testData: any = await testResp.json();
          if (testResp.ok) {
            console.log(`[Resend Sandbox SUCCESS] Email delivered live to your inbox (${devRecipient})! (ID: ${testData?.id})`);
            return { success: true, message: `Real-time OTP email delivered to ${devRecipient}`, provider: 'Resend Sandbox' };
          }
        }
      } else {
        console.warn(`[Resend API Warning] Delivery issue:`, resData);
      }
    } catch (err: any) {
      console.warn(`[Resend API Network Error]`, err.message);
    }
  }

  // 2. Try Brevo Cloud API (if key is set)
  if (brevoApiKey) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: toEmail, name: studentName }],
          subject: `🔐 ${otp} is your Manav Rachna ICCF Login Code`,
          htmlContent
        })
      });

      const resData: any = await response.json();
      if (response.ok) {
        console.log(`[Brevo API] Real-time OTP email delivered to ${toEmail} (MessageId: ${resData?.messageId})`);
        return { success: true, message: `Real-time OTP email sent via Brevo to ${toEmail}`, provider: 'Brevo' };
      } else {
        console.warn(`[Brevo API Warning] Delivery issue:`, resData);
      }
    } catch (err: any) {
      console.warn(`[Brevo API Network Error]`, err.message);
    }
  }

  // 3. Fallback when API key is not yet configured in .env
  console.log(`----------------------------------------------------------------------`);
  console.log(`[EMAIL DISPATCH NOTICE] Real-time OTP generated for ${toEmail}:`);
  console.log(`>> CODE: ${otp} <<`);
  console.log(`>> Note: To send actual emails to student inboxes, add RESEND_API_KEY or BREVO_API_KEY to server/.env <<`);
  console.log(`----------------------------------------------------------------------`);

  return { 
    success: true, 
    message: `OTP generated for ${toEmail} (${otp}). Add RESEND_API_KEY in server/.env for live inbox delivery.`,
    provider: 'Simulated' 
  };
}

interface SendInviteOptions {
  toEmail: string;
  name?: string;
  portalUrl?: string;
  role?: string;
}

export async function sendInviteEmail({ toEmail, name = 'Student', portalUrl = 'https://iccf.manavrachna.edu.in', role = 'student' }: SendInviteOptions): Promise<{ success: boolean; message: string }> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const resendApiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.EMAIL_FROM || smtpUser || 'onboarding@resend.dev';
  const senderName = process.env.EMAIL_FROM_NAME || 'Manav Rachna ICCF Portal';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Invitation to ICCF Competency Assessment</title></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2; margin: 0; padding: 24px;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #ECE7DF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(139, 21, 40, 0.08);">
        <div style="background: linear-gradient(135deg, #8B1528 0%, #5E0D1B 100%); padding: 32px 24px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 1.45rem; font-weight: 800;">Manav Rachna University</h1>
          <p style="margin: 6px 0 0; opacity: 0.9; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase;">
            Institutional Competency Certification Framework (ICCF)
          </p>
        </div>
        <div style="padding: 36px 32px; background-color: #FFFFFF;">
          <p style="font-size: 1.05rem; color: #1C1917; margin-top: 0;">Dear <strong>${name}</strong>,</p>
          <p style="color: #57534E; font-size: 0.92rem; line-height: 1.6;">
            You have been officially invited and authorized as a participant in the <strong>Manav Rachna ICCF Human-Centric Skills Assessment Beta</strong>.
          </p>
          <div style="background-color: #FAF8F5; border: 1px solid #E7E5E4; border-radius: 14px; padding: 18px 20px; margin: 24px 0;">
            <div style="font-size: 0.85rem; font-weight: 700; color: #1C1917; margin-bottom: 8px;">Your Portal Access Details:</div>
            <div style="font-size: 0.82rem; color: #57534E; line-height: 1.6;">
              • <strong>Registered Email:</strong> ${toEmail}<br>
              • <strong>Portal Role:</strong> ${role.toUpperCase()}<br>
              • <strong>Access Method:</strong> Sign in with email OTP or click "Continue with Google"
            </div>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${portalUrl}" style="background-color: #8B1528; color: #FFFFFF; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 0.95rem; display: inline-block;">
              Access ICCF Assessment Portal →
            </a>
          </div>
          <p style="color: #78716C; font-size: 0.8rem; line-height: 1.5;">
            Upon logging in, you will be able to take the diagnostic assessment, evaluate your 15 core competency dimensions, and receive your verified institutional credential.
          </p>
        </div>
        <div style="background-color: #FAF7F2; padding: 18px 24px; text-align: center; font-size: 0.74rem; color: #A8A29E; border-top: 1px solid #ECE7DF;">
          Manav Rachna Educational Institutions • Sector 43, Aravalli Hills, Faridabad, Haryana
        </div>
      </div>
    </body>
    </html>
  `;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpPort === 465, auth: { user: smtpUser, pass: smtpPass } });
      await transporter.sendMail({ from: `"${senderName}" <${smtpUser}>`, to: toEmail, subject: `🎓 You're invited to the Manav Rachna ICCF Competency Assessment`, html: htmlContent });
      return { success: true, message: `Invite delivered to ${toEmail}` };
    } catch (e: any) { console.warn('[SMTP Invite Error]', e.message); }
  }

  if (resendApiKey) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${senderName} <${senderEmail}>`, to: [toEmail], subject: `🎓 You're invited to the Manav Rachna ICCF Competency Assessment`, html: htmlContent })
      });
      if (resp.ok) return { success: true, message: `Invite delivered via Resend to ${toEmail}` };
    } catch (e: any) { console.warn('[Resend Invite Error]', e.message); }
  }

  console.log(`[INVITE EMAIL DISPATCH] For ${toEmail} (${name}) -> Link: ${portalUrl}`);
  return { success: true, message: `Invite simulated for ${toEmail}` };
}
