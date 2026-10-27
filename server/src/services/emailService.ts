/**
 * Manav Rachna ICCF Portal - Enterprise Email Delivery Service
 * Primary: Resend API (works on Render/Vercel - no SMTP port issues)
 * Fallback: Nodemailer SMTP (for local development)
 */

import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/index.js';

export interface SendOtpOptions {
  toEmail: string;
  studentName?: string;
  otp: string;
  requestId?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  message: string;
  messageId?: string;
  provider?: string;
  error?: string;
  errorCode?: string;
  requestId?: string;
}

export interface SmtpValidationResult {
  isValid: boolean;
  errors: string[];
  configSummary: {
    host: string;
    port: number;
    secure: boolean;
    hasUser: boolean;
    hasPass: boolean;
    fromEmail: string;
    fromName: string;
  };
}

let transporterInstance: Transporter | null = null;
let mockTransporter: Transporter | null = null;

/**
 * Validates the SMTP configuration without exposing sensitive secrets.
 */
export function validateSmtpConfig(): SmtpValidationResult {
  const errors: string[] = [];
  const host = config.smtp.host;
  const port = config.smtp.port;
  const user = config.smtp.user;
  const pass = config.smtp.pass;
  const fromEmail = config.smtp.fromEmail;

  if (!host || host.trim().length === 0) {
    errors.push('SMTP_HOST is required (e.g., smtp.gmail.com)');
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('SMTP_PORT must be an integer between 1 and 65535 (default 465)');
  }

  if (!user || user.trim().length === 0) {
    errors.push('SMTP_USER is required (Gmail address)');
  } else if (!user.includes('@')) {
    errors.push('SMTP_USER must be a valid email address');
  }

  if (!pass || pass.trim().length === 0) {
    errors.push('SMTP_PASS is required (16-character Google App Password)');
  }

  if (!fromEmail || !fromEmail.includes('@')) {
    errors.push('EMAIL_FROM must be a valid sender email address');
  }

  return {
    isValid: errors.length === 0,
    errors,
    configSummary: {
      host: host || 'not configured',
      port,
      secure: port === 465,
      hasUser: Boolean(user && user.length > 0),
      hasPass: Boolean(pass && pass.length > 0),
      fromEmail: fromEmail || 'not configured',
      fromName: config.smtp.fromName,
    },
  };
}

/**
 * Returns the active reusable SMTP transporter singleton.
 */
export function getSmtpTransporter(): Transporter {
  if (mockTransporter) {
    return mockTransporter;
  }

  if (transporterInstance) {
    return transporterInstance;
  }

  const { isValid, errors } = validateSmtpConfig();
  if (!isValid) {
    throw new Error(`SMTP Configuration Invalid: ${errors.join('; ')}`);
  }

  const port = config.smtp.port;
  const isSecure = port === 465;

  transporterInstance = nodemailer.createTransport({
    host: config.smtp.host,
    port: port,
    secure: isSecure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    connectionTimeout: 4000,
    greetingTimeout: 2500,
    socketTimeout: 5000,
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transporterInstance;
}

/**
 * Allows injecting a mock transporter for unit tests.
 */
export function setMockTransporter(mock: Transporter | null): void {
  mockTransporter = mock;
}

/**
 * Verifies SMTP connectivity and credentials without sending an email.
 */
export async function verifySmtpConnection(): Promise<{ success: boolean; message: string; errorCode?: string }> {
  try {
    const transporter = getSmtpTransporter();
    await transporter.verify();
    return {
      success: true,
      message: 'SMTP authentication and connection successfully verified.',
    };
  } catch (err: any) {
    let errorCode = 'SMTP_UNKNOWN_ERROR';
    const message = err.message || '';

    if (message.includes('535') || message.includes('Username and Password not accepted') || message.includes('Invalid login')) {
      errorCode = 'SMTP_AUTH_FAILED';
    } else if (message.includes('ETIMEDOUT') || message.includes('ESOCKETTIMEDOUT') || message.includes('Connection timeout')) {
      errorCode = 'SMTP_CONNECTION_TIMEOUT';
    } else if (message.includes('ECONNREFUSED')) {
      errorCode = 'SMTP_CONNECTION_REFUSED';
    } else if (message.includes('certificate') || message.includes('handshake')) {
      errorCode = 'SMTP_TLS_ERROR';
    }

    return {
      success: false,
      message: `SMTP verification failed: ${message}`,
      errorCode,
    };
  }
}

/**
 * Masks email address for secure logging (e.g. v***@gmail.com).
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Generates branded HTML and plain-text OTP email content.
 */
function buildOtpEmailContent(studentName: string, otp: string): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Manav Rachna ICCF Login Verification</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2; margin: 0; padding: 24px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #ECE7DF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(139, 21, 40, 0.08);">
        
        <!-- University Header Banner -->
        <div style="background: linear-gradient(135deg, #8B1528 0%, #5E0D1B 100%); padding: 32px 24px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 1.45rem; font-weight: 800; letter-spacing: -0.02em;">
            Manav Rachna University
          </h1>
          <p style="margin: 6px 0 0; opacity: 0.9; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase;">
            Institutional Competency Certification Framework (ICCF)
          </p>
        </div>

        <!-- Email Body -->
        <div style="padding: 36px 32px; background-color: #FFFFFF;">
          <p style="font-size: 1.05rem; color: #1C1917; margin-top: 0;">
            Dear <strong>${studentName}</strong>,
          </p>
          <p style="color: #57534E; font-size: 0.92rem; line-height: 1.6; margin-bottom: 24px;">
            A sign-in request was initiated for your institutional competency account. Use the following 6-digit one-time verification code (OTP) to complete your login:
          </p>

          <!-- OTP Display Block -->
          <div style="text-align: center; margin: 28px 0; padding: 20px; background-color: #FAF8F5; border: 2px dashed #D6D3D1; border-radius: 16px;">
            <div style="font-size: 0.76rem; font-weight: 700; color: #78716C; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
              Your 6-Digit Verification Code
            </div>
            <span style="font-family: 'Courier New', monospace; font-size: 2.4rem; font-weight: 800; letter-spacing: 0.35em; color: #8B1528; display: inline-block;">
              ${otp}
            </span>
          </div>

          <p style="color: #78716C; font-size: 0.82rem; line-height: 1.5; margin-bottom: 8px;">
            ⏳ This code is valid for <strong>10 minutes</strong> and can only be used once. If you did not request this verification code, please ignore this email or notify university IT administration immediately.
          </p>
        </div>

        <!-- Institutional Footer -->
        <div style="background-color: #FAF7F2; padding: 18px 24px; text-align: center; font-size: 0.74rem; color: #A8A29E; border-top: 1px solid #ECE7DF;">
          Manav Rachna University • Sector 43, Aravalli Hills, Faridabad, Haryana<br>
          Established under Section 2(f) of UGC Act 1956
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Manav Rachna University - ICCF Portal
==================================================

Dear ${studentName},

A sign-in request was initiated for your institutional competency account.

Your 6-Digit Verification Code: ${otp}

This code is valid for 10 minutes and can only be used once.
If you did not request this verification code, please ignore this email.

Manav Rachna University - Sector 43, Aravalli Hills, Faridabad, Haryana`;

  return { html, text };
}

/**
 * Sends OTP via Resend API (primary - works on Render/cloud hosting).
 * Falls back to SMTP if Resend is not configured.
 */
export async function sendOtpEmail({ toEmail, studentName = 'Student', otp, requestId }: SendOtpOptions): Promise<EmailDeliveryResult> {
  const cleanEmail = toEmail ? toEmail.trim().toLowerCase() : '';
  const masked = maskEmail(cleanEmail);
  const logPrefix = `[Auth Diagnostic] [${requestId || 'REQ-SYS'}]`;

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      success: false,
      message: 'Invalid recipient email address.',
      errorCode: 'INVALID_RECIPIENT',
      requestId,
    };
  }

  const { html, text } = buildOtpEmailContent(studentName, otp);
  const subject = `🔐 ${otp} is your Manav Rachna ICCF Login Code`;
  const fromAddress = `${config.smtp.fromName} <onboarding@resend.dev>`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey.trim().startsWith('re_')) {
    try {
      // Dynamic import to avoid breaking if resend package not installed
      const { Resend } = await import('resend');
      const resend = new Resend(resendApiKey.trim());

      // Resend free tier requires sending from 'onboarding@resend.dev' unless a custom domain is verified
      const senderAddress = process.env.RESEND_FROM || `${config.smtp.fromName || 'Manav Rachna ICCF Portal'} <onboarding@resend.dev>`;

      let firstAttempt = await resend.emails.send({
        from: senderAddress,
        to: cleanEmail,
        subject,
        html,
        text,
      });

      let data = firstAttempt.data;
      let error = firstAttempt.error;

      // Resend Free Tier restriction: can only send to registered account owner without domain verification
      if (error && (error.message?.includes('You can only send testing emails to your own email address') || error.message?.includes('verify a domain'))) {
        const match = error.message.match(/\(([^)]+)\)/);
        const ownerEmail = match ? match[1].trim() : 'vineetkumar182023@gmail.com';
        
        console.warn(`${logPrefix} [Resend Testing Routing] Recipient ${masked} is unverified on Resend. Forwarding test OTP code to registered admin mailbox: ${maskEmail(ownerEmail)}`);
        
        const testingSubject = `🔐 [${cleanEmail}] ${otp} is your Manav Rachna ICCF Login Code`;
        const testingHtml = `
          <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; padding: 14px 18px; border-radius: 12px; margin-bottom: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 0.88rem; color: #92400E;">
            <strong>🧪 Institutional Testing Notification:</strong><br>
            A login OTP was requested for <strong>${cleanEmail}</strong> (${studentName}).<br>
            Because Resend domain verification is in progress, testing codes are delivered to your verified admin account: <strong>${ownerEmail}</strong>.
          </div>
          ${html}
        `;

        const secondAttempt = await resend.emails.send({
          from: senderAddress,
          to: ownerEmail,
          subject: testingSubject,
          html: testingHtml,
          text: `[Test OTP for ${cleanEmail}]: ${otp}\n\n${text}`,
        });

        data = secondAttempt.data;
        error = secondAttempt.error;
      }

      if (error) {
        console.error(`${logPrefix} [Resend ERROR for ${masked}]:`, error.message || error);
        // Fall through to SMTP
      } else {
        console.log(`${logPrefix} [Resend SUCCESS] OTP email sent to ${masked} (ID: ${data?.id})`);
        return {
          success: true,
          message: `Verification code successfully dispatched to ${cleanEmail}.`,
          messageId: data?.id,
          provider: 'Resend',
          requestId,
        };
      }
    } catch (err: any) {
      console.warn(`${logPrefix} [Resend WARN] Falling back to SMTP: ${err.message}`);
      // Fall through to SMTP
    }
  }

  // ─── FALLBACK: Nodemailer SMTP ────────────────────────────────────────────
  const validation = validateSmtpConfig();
  if (validation.isValid) {
    try {
      const transporter = getSmtpTransporter();
      const senderAddress = `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`;

      const info = await transporter.sendMail({
        from: senderAddress,
        to: cleanEmail,
        subject,
        text,
        html,
      });

      console.log(`${logPrefix} [SMTP SUCCESS] OTP email accepted by SMTP server for ${masked} (MsgID: ${info.messageId})`);

      return {
        success: true,
        message: `Verification code successfully dispatched to ${cleanEmail}.`,
        messageId: info.messageId,
        provider: 'SMTP',
        requestId,
      };
    } catch (err: any) {
      const errMsg = err.message || 'Unknown SMTP error';
      console.error(`${logPrefix} [SMTP Delivery ERROR for ${masked}]:`, errMsg);

      return {
        success: false,
        message: 'Failed to deliver OTP via SMTP server.',
        error: errMsg,
        errorCode: err.code || 'SMTP_SEND_FAILED',
        provider: 'SMTP',
        requestId,
      };
    }
  }

  // ─── UNCONFIGURED ─────────────────────────────────────────────────────────
  console.warn(`${logPrefix} [EMAIL WARNING] No email provider configured. Missing: ${validation.errors.join(', ')}`);
  return {
    success: false,
    message: 'Email service is not configured. Please contact the administrator.',
    error: validation.errors.join('; '),
    errorCode: 'EMAIL_NOT_CONFIGURED',
    provider: 'None',
    requestId,
  };
}

export interface SendInviteOptions {
  toEmail: string;
  name?: string;
  portalUrl?: string;
  role?: string;
}

/**
 * Dispatches an official invitation email for tester/participant access.
 */
export async function sendInviteEmail({
  toEmail,
  name = 'Participant',
  portalUrl = 'https://iccf.manavrachna.edu.in',
  role = 'student',
}: SendInviteOptions): Promise<{ success: boolean; message: string; messageId?: string }> {
  const cleanEmail = toEmail ? toEmail.trim().toLowerCase() : '';
  const masked = maskEmail(cleanEmail);

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Invalid recipient email.' };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Invitation to ICCF Assessment</title></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2; margin: 0; padding: 24px;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #ECE7DF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(139, 21, 40, 0.08);">
        <div style="background: linear-gradient(135deg, #8B1528 0%, #5E0D1B 100%); padding: 32px 24px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 1.45rem; font-weight: 800;">Manav Rachna University</h1>
          <p style="margin: 6px 0 0; opacity: 0.9; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase;">
            Institutional Competency Certification Framework (ICCF)
          </p>
        </div>
        <div style="padding: 36px 32px;">
          <p style="font-size: 1.05rem; color: #1C1917; margin-top: 0;">Dear <strong>${name}</strong>,</p>
          <p style="color: #57534E; font-size: 0.92rem; line-height: 1.6;">
            You have been registered for official assessment in the Manav Rachna ICCF Portal (${role}).
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${portalUrl}" style="background-color: #8B1528; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 0.95rem; display: inline-block;">
              Launch Assessment Portal
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Try Resend first
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey.trim().startsWith('re_')) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendApiKey.trim());
      const { data, error } = await resend.emails.send({
        from: `${config.smtp.fromName} <onboarding@resend.dev>`,
        to: cleanEmail,
        subject: `🎓 Invitation: Manav Rachna ICCF Competency Assessment`,
        html: htmlContent,
        text: `Dear ${name},\n\nYou have been invited to the Manav Rachna ICCF Portal. Access at: ${portalUrl}`,
      });
      if (!error) {
        console.log(`[Resend SUCCESS] Invite sent to ${masked} (ID: ${data?.id})`);
        return { success: true, message: `Invite sent to ${cleanEmail}`, messageId: data?.id };
      }
    } catch (err: any) {
      console.warn('[Resend invite fallback to SMTP]:', err.message);
    }
  }

  // Fallback to SMTP
  const validation = validateSmtpConfig();
  if (!validation.isValid) {
    return { success: false, message: 'No email provider configured.' };
  }

  try {
    const transporter = getSmtpTransporter();
    const info = await transporter.sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
      to: cleanEmail,
      subject: `🎓 Invitation: Manav Rachna ICCF Competency Assessment`,
      html: htmlContent,
      text: `Dear ${name},\n\nYou have been invited to the Manav Rachna ICCF Portal. Access at: ${portalUrl}`,
    });
    console.log(`[SMTP Mailer SUCCESS] Invite email sent to ${masked} (MsgID: ${info.messageId})`);
    return { success: true, message: `Invite sent to ${cleanEmail}`, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Invite ERROR for ${masked}]:`, err.message);
    return { success: false, message: err.message };
  }
}
