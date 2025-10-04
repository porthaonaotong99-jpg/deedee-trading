import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import {
  EmailService,
  EmailOptions,
  OtpEmailData,
  ResetLinkEmailData,
} from '../interfaces/email.interface';

@Injectable()
export class NodemailerEmailService implements EmailService {
  private readonly logger = new Logger(NodemailerEmailService.name);
  private transporter: nodemailer.Transporter | null;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.configService.get<number>('SMTP_PORT', 587));
    // Robust boolean parsing for secure (tolerate 'true', 'false', '1', '0')
    const secureRaw = this.configService.get<string>('SMTP_SECURE');
    let secure = false;
    if (typeof secureRaw === 'string') {
      const lowered = secureRaw.trim().toLowerCase();
      secure = ['true', '1', 'yes', 'y'].includes(lowered);
    } else if (typeof secureRaw === 'boolean') {
      secure = secureRaw;
    }
    const user = this.configService.get<string>('SMTP_USER');
    let pass = this.configService.get<string>('SMTP_PASSWORD');
    if (pass) {
      // Strip surrounding quotes and internal spaces sometimes copied from UI for app passwords
      pass = pass.replace(/^['"`](.*)['"`]$/u, '$1').replace(/\s+/g, '');
    }
    const ignoreTls =
      this.configService.get<string>('SMTP_IGNORE_TLS') === 'true';
    const requireTls =
      this.configService.get<string>('SMTP_REQUIRE_TLS') === 'true';

    // Auto-adjust secure based on common port conventions if user set a mismatched combination
    if (port === 465 && secure === false) {
      this.logger.warn(
        'Port 465 detected but SMTP_SECURE=false. Overriding to secure=true (implicit SSL).',
      );
      secure = true;
    } else if (port === 587 && secure === true) {
      this.logger.warn(
        'Port 587 detected with SMTP_SECURE=true. Overriding to secure=false (STARTTLS upgrade).',
      );
      secure = false;
    }

    const config: SMTPTransport.Options = {
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      tls: {
        rejectUnauthorized:
          this.configService.get<string>(
            'SMTP_TLS_REJECT_UNAUTHORIZED',
            'true',
          ) !== 'false',
      },
    };
    console.log({ config });

    if (ignoreTls || requireTls) {
      const extendedConfig = config as SMTPTransport.Options & {
        ignoreTLS?: boolean;
        requireTLS?: boolean;
      };
      if (ignoreTls) extendedConfig.ignoreTLS = true;
      if (requireTls) extendedConfig.requireTLS = true;
    }

    const debug = this.configService.get<string>('SMTP_DEBUG') === 'true';
    this.logger.log(
      `Initializing SMTP transporter: host=${host} port=${port} secure=${secure} auth=${user ? 'yes' : 'no'} ignoreTLS=${ignoreTls} requireTLS=${requireTls} debug=${debug}`,
    );
    if (debug) {
      this.logger.debug(
        `Raw env => SMTP_SECURE='${secureRaw}' (parsed: ${secure}); PASSWORD_LENGTH=${pass ? pass.length : 0}`,
      );
    }

    // Validate required configuration
    if (!user || !pass) {
      this.logger.warn(
        'SMTP credentials not configured. Email functionality will be disabled.',
      );
      this.transporter = null;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({ ...config, debug });
    } catch (ctorErr) {
      this.logger.error('Failed to construct SMTP transporter', ctorErr);
      this.transporter = null;
      return;
    }

    // Verify the connection configuration
    this.transporter.verify((error) => {
      if (error) {
        const hintParts: string[] = [];
        if (/self signed/i.test(String(error))) {
          hintParts.push(
            'Self-signed certificate detected. Consider setting SMTP_TLS_REJECT_UNAUTHORIZED=false ONLY for development.',
          );
        }
        if (/wrong version number/i.test(String(error))) {
          hintParts.push(
            'TLS version mismatch. Make sure port & secure match: 465 -> secure=true, 587 -> secure=false (STARTTLS).',
          );
        }
        if (/certificate/i.test(String(error)) && port === 587 && secure) {
          hintParts.push(
            'Detected secure=true with port 587; change to SMTP_SECURE=false.',
          );
        }
        this.logger.error('SMTP connection failed:', error);
        if (hintParts.length) {
          this.logger.warn('Troubleshooting hints:');
          hintParts.forEach((h) => this.logger.warn(' - ' + h));
        }
      } else {
        this.logger.log('SMTP server is ready to take our messages');
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        'Email transporter not configured. Skipping email send.',
      );
      return;
    }

    try {
      const fromEmail =
        this.configService.get<string>('SMTP_FROM_EMAIL') ||
        this.configService.get<string>('SMTP_USER') ||
        'noreply@deedee-trading.com';

      const mailOptions = {
        from: {
          name: this.configService.get<string>(
            'SMTP_FROM_NAME',
            'PhaJao invest',
          ),
          address: fromEmail,
        },
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };
      console.log({ mailOptions });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const info: { messageId?: string } =
        await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `📧 Email sent successfully to ${options.to}. Message ID: ${info.messageId || 'N/A'}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      // Provide more context for TLS mismatch errors
      if (/wrong version number/i.test(errorMessage)) {
        throw new Error(
          `Failed to send email: TLS negotiation failed (wrong version number). Check SMTP_PORT & SMTP_SECURE combination. ${errorMessage}`,
        );
      }
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }

  async sendOtpEmail(data: OtpEmailData): Promise<void> {
    const subject = 'Password Reset OTP - PhaJao invest';
    const html = this.generateOtpEmailHtml(data);
    const text = this.generateOtpEmailText(data);

    await this.sendEmail({
      to: data.email,
      subject,
      html,
      text,
    });
  }

  async sendResetLinkEmail(data: ResetLinkEmailData): Promise<void> {
    const subject = 'Password Reset Link - PhaJao invest';
    const html = this.generateResetLinkEmailHtml(data);
    const text = this.generateResetLinkEmailText(data);

    await this.sendEmail({
      to: data.email,
      subject,
      html,
      text,
    });
  }

  private generateOtpEmailHtml(data: OtpEmailData): string {
    const customerName = data.customerName || 'Customer';
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset OTP</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2c5aa0;">PhaJao invest</h1>
            <h2>Password Reset OTP</h2>
            
            <p>Hello ${customerName},</p>
            
            <p>You requested to reset your password. Please use the following OTP code:</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
              <h1 style="color: #2c5aa0; font-size: 36px; margin: 0; letter-spacing: 5px;">${data.otp}</h1>
            </div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This OTP is valid for 15 minutes only</li>
              <li>Do not share this OTP with anyone</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
            
            <p>Expires at: ${data.expiresAt.toLocaleString()}</p>
            
            <hr style="margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              This is an automated message from PhaJao invest. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private generateOtpEmailText(data: OtpEmailData): string {
    const customerName = data.customerName || 'Customer';
    return `
    PhaJao invest - Password Reset OTP

    Hello ${customerName},

    You requested to reset your password. Please use the following OTP code: ${data.otp}

    Important:
    - This OTP is valid for 15 minutes only
    - Do not share this OTP with anyone
    - If you didn't request this, please ignore this email

    Expires at: ${data.expiresAt.toLocaleString()}

    This is an automated message from PhaJao invest.
    `.trim();
  }

  private generateResetLinkEmailHtml(data: ResetLinkEmailData): string {
    const customerName = data.customerName || 'Customer';
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Link</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2c5aa0;">PhaJao invest</h1>
            <h2>Password Reset Request</h2>
            
            <p>Hello ${customerName},</p>
            
            <p>You requested to reset your password. Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetLink}" 
                 style="background-color: #2c5aa0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p>Or copy and paste this link in your browser:</p>
            <p style="background-color: #f5f5f5; padding: 10px; border-radius: 3px; word-break: break-all;">
              ${data.resetLink}
            </p>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This link is valid for 1 hour only</li>
              <li>Do not share this link with anyone</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
            
            <p>Expires at: ${data.expiresAt.toLocaleString()}</p>
            
            <hr style="margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              This is an automated message from PhaJao invest. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private generateResetLinkEmailText(data: ResetLinkEmailData): string {
    const customerName = data.customerName || 'Customer';
    return `
    PhaJao invest - Password Reset Request

    Hello ${customerName},

    You requested to reset your password. Please visit the following link to reset your password:

    ${data.resetLink}

    Important:
    - This link is valid for 1 hour only
    - Do not share this link with anyone
    - If you didn't request this, please ignore this email

    Expires at: ${data.expiresAt.toLocaleString()}

    This is an automated message from PhaJao invest.
    `.trim();
  }
}
