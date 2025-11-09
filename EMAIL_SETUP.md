# Email Configuration Guide

## Overview
Journey Planner uses email for:
- Sending user invitation links
- Password reset codes (forgot password flow)
- User notifications

## Development Mode (Default)
If SMTP credentials are not configured, the system will:
- ✅ Continue working normally
- 📧 Log email content to console instead of sending
- ⚠️ Show warning: "Email not sent (SMTP not configured)"

This allows you to develop and test without setting up email.

## Production Setup

### Option 1: Gmail (Recommended for Testing)

1. **Enable 2-Factor Authentication** on your Gmail account
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "Journey Planner"
   - Copy the 16-character password

3. **Update `server/.env`**
   ```bash
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   FRONTEND_URL=http://localhost:5173
   ```

### Option 2: SendGrid (Recommended for Production)

1. **Create SendGrid Account**
   - Go to: https://signup.sendgrid.com/
   - Free tier: 100 emails/day

2. **Create API Key**
   - Settings → API Keys → Create API Key
   - Name: "Journey Planner"
   - Permissions: Full Access
   - Copy the key

3. **Update `server/.env`**
   ```bash
   SMTP_SERVER=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USERNAME=apikey
   SMTP_PASSWORD=your-sendgrid-api-key
   FRONTEND_URL=https://your-domain.com
   ```

### Option 3: Mailgun

1. **Create Mailgun Account**
   - Go to: https://www.mailgun.com/
   - Free tier: 5,000 emails/month

2. **Get SMTP Credentials**
   - Sending → Domain Settings → SMTP credentials
   - Copy username and password

3. **Update `server/.env`**
   ```bash
   SMTP_SERVER=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USERNAME=postmaster@your-domain.mailgun.org
   SMTP_PASSWORD=your-mailgun-password
   FRONTEND_URL=https://your-domain.com
   ```

### Option 4: Custom SMTP Server

For self-hosted or corporate email:

```bash
SMTP_SERVER=mail.your-company.com
SMTP_PORT=587
SMTP_USERNAME=noreply@your-company.com
SMTP_PASSWORD=your-smtp-password
FRONTEND_URL=https://your-domain.com
```

## Testing Email Configuration

### Method 1: Invite a User (Recommended)
1. Login as admin
2. Go to Settings → Admin Panel
3. Enter an email in "Invite New User"
4. Click "Send Invitation"
5. Check console logs or email inbox

### Method 2: Forgot Password Flow
1. Go to Login page
2. Click "Forgot Password?"
3. Enter your email
4. Check console logs or email inbox for reset code

### Method 3: Backend Test (Manual)
Create a test file `server/test-email.ts`:

```typescript
import { sendEmail } from './src/services/emailService';
import dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
  try {
    await sendEmail({
      to: 'your-test-email@example.com',
      subject: 'Test Email from Journey Planner',
      html: '<h1>Test Email</h1><p>If you receive this, email is working!</p>',
      text: 'Test Email - If you receive this, email is working!'
    });
    console.log('✅ Email test passed!');
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
  process.exit(0);
}

testEmail();
```

Run: `npx ts-node test-email.ts`

## Troubleshooting

### "Missing credentials for PLAIN" Error
**Problem:** SMTP credentials not set or incorrect

**Solution:**
1. Check `server/.env` file exists
2. Verify `SMTP_USERNAME` and `SMTP_PASSWORD` are set
3. Restart server: `npm run server:dev`

### Gmail "Less secure app" Error
**Problem:** Using regular password instead of App Password

**Solution:**
- Use App Password (16 characters)
- Enable 2-Factor Authentication first

### Emails Go to Spam
**Problem:** No SPF/DKIM records

**Solution:**
- Use professional email service (SendGrid, Mailgun)
- Configure SPF/DKIM records for your domain
- Use verified sender email

### Port 587 Blocked
**Problem:** Firewall blocking SMTP port

**Solution:**
- Try port 465 with `secure: true`
- Contact IT/hosting provider
- Use cloud-based SMTP service

## Security Best Practices

1. **Never commit `.env` file** to git
2. **Use App Passwords** (Gmail) or API Keys (SendGrid)
3. **Rotate credentials** regularly
4. **Use environment variables** in production
5. **Enable rate limiting** for email sending

## Development Tips

### Console Logging (No SMTP)
- Leave SMTP credentials empty
- Check backend console for email content
- Copy invitation tokens/reset codes from logs

### Local Testing
- Use temporary email services: temp-mail.org, guerrillamail.com
- Use your personal email for testing

### Production Monitoring
- Monitor email delivery rates
- Set up alerts for failed sends
- Check spam complaints

## Email Templates

Current templates in the app:
1. **Invitation Email** (`sendInvitationEmail`)
   - Registration link with token
   - Expires in 7 days

2. **Password Reset** (`sendPasswordResetEmail`)
   - 6-digit verification code
   - Expires in 15 minutes

## Cost Considerations

| Service | Free Tier | Paid Plans |
|---------|-----------|------------|
| Gmail | N/A (personal use) | Google Workspace |
| SendGrid | 100/day | $19.95/mo (40k emails) |
| Mailgun | 5,000/month | $35/mo (50k emails) |
| AWS SES | 62,000/month | $0.10 per 1,000 |

## Summary

- ✅ **Development:** Works without SMTP (console logs)
- ✅ **Testing:** Use Gmail App Password
- ✅ **Production:** Use SendGrid or Mailgun
- ✅ **Enterprise:** Use corporate SMTP or AWS SES

Need help? Check backend console for detailed error messages!
