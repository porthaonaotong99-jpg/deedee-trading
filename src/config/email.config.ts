import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER,
  password: process.env.SMTP_PASSWORD,
  fromName: process.env.SMTP_FROM_NAME || 'DeeDee Trading',
  fromEmail: process.env.SMTP_FROM_EMAIL,
  ignoreTLS: process.env.SMTP_IGNORE_TLS === 'true',
  requireTLS: process.env.SMTP_REQUIRE_TLS === 'true',
  tlsRejectUnauthorized:
    (process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true') !== 'false',
}));
