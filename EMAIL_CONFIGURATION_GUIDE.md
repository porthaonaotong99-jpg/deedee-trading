# Email Configuration Guide

This guide explains how to configure and use the email functionality in the DeeDee Trading backend.

## Overview

The email service uses **Nodemailer** to send emails for:
- Password reset OTP codes
- Password reset links
- Other transactional emails

## Configuration

### Environment Variables

Add these environment variables to your `.env` file:

```bash
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_NAME=DeeDee Trading
SMTP_FROM_EMAIL=noreply@deedee-trading.com
# Optional advanced TLS / troubleshooting flags
# Force ignoring TLS (rare; for dev only)
# SMTP_IGNORE_TLS=false
# Require STARTTLS upgrade (if server requires it explicitly)
# SMTP_REQUIRE_TLS=false
# Allow self-signed certs in dev ONLY (set to false to disable reject)
# SMTP_TLS_REJECT_UNAUTHORIZED=true
```

### Gmail Configuration

If using Gmail, follow these steps:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password as `SMTP_PASSWORD`

3. **Configuration for Gmail**:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASSWORD=your-16-character-app-password
   ```

### Other Email Providers

#### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### Yahoo Mail
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### Custom SMTP Server
```bash
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false  # Use true for port 465
```

## Testing Email Configuration

Use the provided test script to verify your email configuration:

```bash
# Make sure your .env file is configured
node scripts/test-email.js
```

The script will:
- ✅ Verify SMTP connection
- 📧 Send a test email
- 🚀 Confirm everything is working

## Email Service Implementation

### Service Structure

The email service implements the `EmailService` interface:

```typescript
interface EmailService {
  sendEmail(options: EmailOptions): Promise<void>;
  sendOtpEmail(data: OtpEmailData): Promise<void>;
  sendResetLinkEmail(data: ResetLinkEmailData): Promise<void>;
}
```

### Usage in Controllers

The email service is automatically injected into the `CustomersService`:

```typescript
// Password reset with OTP
await this.emailService.sendOtpEmail({
  email: customer.email,
  otp: '123456',
  expiresAt: expirationTime,
  customerName: customer.name,
});

// Password reset with link
await this.emailService.sendResetLinkEmail({
  email: customer.email,
  resetLink: 'https://app.deedee-trading.com/reset-password?token=...',
  expiresAt: expirationTime,
  customerName: customer.name,
});
```

## Email Templates

### OTP Email Template
- **Subject**: "Password Reset OTP - DeeDee Trading"
- **Content**: Clean HTML template with OTP code
- **Security**: 15-minute expiration notice

### Reset Link Email Template
- **Subject**: "Password Reset Link - DeeDee Trading"
- **Content**: HTML template with reset button and link
- **Security**: 1-hour expiration notice

## Security Features

1. **Rate Limiting**: Email sending is rate-limited per customer
2. **Token Hashing**: Reset tokens are hashed before storage
3. **Expiration**: All reset codes/links have time limits
4. **Email Enumeration Protection**: Consistent responses regardless of email existence

## Error Handling

The email service includes comprehensive error handling:

- **Connection Failures**: Logged with troubleshooting tips
- **Authentication Errors**: Clear error messages
- **Graceful Degradation**: Application continues if email fails
- **Detailed Logging**: Full audit trail of email attempts

## Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Check username/password
   - For Gmail, use App Password instead of regular password

2. **"Connection timeout"**
   - Check SMTP host and port
   - Verify firewall settings

3. **"Self signed certificate"**
   - Set `SMTP_SECURE=false` for port 587
   - Set `SMTP_SECURE=true` for port 465

### Debug Mode

Enable detailed logging by setting:
```bash
NODE_ENV=development
```

This will show detailed email sending logs in the console.

## Production Considerations

1. **Use a dedicated email service** (SendGrid, AWS SES, etc.) for production
2. **Set up proper DNS records** (SPF, DKIM, DMARC)
3. **Monitor email delivery rates**
4. **Implement email bounce handling**
5. **Use environment-specific templates**

## Development vs Production

### Development
- Uses mock or personal email for testing
- Detailed console logging
- Self-addressed test emails

### Production
- Professional email service provider
- Minimal logging for security
- Proper from/reply-to addresses
- Email analytics and monitoring