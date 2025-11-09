import nodemailer from 'nodemailer';

// Email configuration from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"Journey Planner" <${process.env.SMTP_USERNAME}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log(`✅ Email sent to ${options.to}`);
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error('Failed to send email');
  }
}

/**
 * Send invitation email with registration link
 */
export async function sendInvitationEmail(
  email: string,
  token: string,
  invitedBy: string
): Promise<void> {
  const registrationUrl = `${process.env.FRONTEND_URL || 'http://localhost'}/register?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .button {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 8px;
          margin: 20px 0;
          font-weight: 600;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🗺️ Journey Planner</h1>
        <p>You're invited to join Journey Planner!</p>
      </div>
      <div class="content">
        <p>Hello!</p>
        <p><strong>${invitedBy}</strong> has invited you to join Journey Planner, a collaborative travel planning application.</p>
        <p>Click the button below to create your account:</p>
        <center>
          <a href="${registrationUrl}" class="button">Create Account</a>
        </center>
        <p>This invitation link will expire in 7 days.</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Journey Planner. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Invitation to Join Journey Planner',
    html,
    text: `You've been invited to join Journey Planner by ${invitedBy}. Register at: ${registrationUrl}`,
  });
}

/**
 * Send password reset code email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetCode: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .code {
          background: white;
          border: 2px solid #667eea;
          padding: 20px;
          font-size: 32px;
          font-weight: bold;
          text-align: center;
          letter-spacing: 8px;
          border-radius: 8px;
          margin: 20px 0;
          font-family: 'Courier New', monospace;
          color: #667eea;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔒 Password Reset</h1>
        <p>Journey Planner</p>
      </div>
      <div class="content">
        <p>Hello!</p>
        <p>You requested a password reset for your Journey Planner account.</p>
        <p>Your verification code is:</p>
        <div class="code">${resetCode}</div>
        <p>Enter this code on the password reset page along with your new password.</p>
        <div class="warning">
          <strong>⚠️ Security Notice:</strong> This code expires in 15 minutes. If you didn't request this reset, please ignore this email and contact an administrator.
        </div>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Journey Planner. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Password Reset Code - Journey Planner',
    html,
    text: `Your password reset code is: ${resetCode}. This code expires in 15 minutes.`,
  });
}

export default {
  sendEmail,
  sendInvitationEmail,
  sendPasswordResetEmail,
};
