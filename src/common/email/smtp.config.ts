import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

/**
 * Builds and verifies a nodemailer transporter using environment configuration.
 * Centralized so every module (customers, stock-picks, etc.) shares identical logic.
 *
 * Environment variables supported:
 *  - SMTP_HOST (default smtp.gmail.com)
 *  - SMTP_PORT (default 587)
 *  - SMTP_SECURE (true|false|1|0|yes|no)
 *  - SMTP_USER / SMTP_PASSWORD (credentials)
 *  - SMTP_IGNORE_TLS (development only)
 *  - SMTP_REQUIRE_TLS
 *  - SMTP_TLS_REJECT_UNAUTHORIZED (default true)
 *  - SMTP_DEBUG (true enables nodemailer debug + extra logs)
 */
export function createSmtpTransport(
  configService: ConfigService,
  logger: Logger,
  scope = 'Email',
): nodemailer.Transporter | null {
  const host = configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
  const port = Number(configService.get<number>('SMTP_PORT', 587));

  const secureRaw = configService.get<string>('SMTP_SECURE');
  let secure = false;
  if (typeof secureRaw === 'string') {
    secure = ['true', '1', 'yes', 'y'].includes(secureRaw.trim().toLowerCase());
  } else if (typeof secureRaw === 'boolean') {
    secure = secureRaw;
  }

  const user = configService.get<string>('SMTP_USER');
  let pass = configService.get<string>('SMTP_PASSWORD');
  if (pass) {
    pass = pass.replace(/^['"`](.*)['"`]$/u, '$1').replace(/\s+/g, '');
  }

  const ignoreTls = configService.get<string>('SMTP_IGNORE_TLS') === 'true';
  const requireTls = configService.get<string>('SMTP_REQUIRE_TLS') === 'true';

  // Auto-normalize common mismatches
  if (port === 465 && secure === false) {
    logger.warn(
      `[${scope}] Port 465 detected with secure=false; forcing secure=true (implicit SSL).`,
    );
    secure = true;
  } else if (port === 587 && secure === true) {
    logger.warn(
      `[${scope}] Port 587 detected with secure=true; forcing secure=false (STARTTLS).`,
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
        configService.get<string>('SMTP_TLS_REJECT_UNAUTHORIZED', 'true') !==
        'false',
    },
  };

  if (ignoreTls || requireTls) {
    const ext = config as SMTPTransport.Options & {
      ignoreTLS?: boolean;
      requireTLS?: boolean;
    };
    if (ignoreTls) ext.ignoreTLS = true;
    if (requireTls) ext.requireTLS = true;
  }

  const debug = configService.get<string>('SMTP_DEBUG') === 'true';
  logger.log(
    `[${scope}] Initializing SMTP transporter: host=${host} port=${port} secure=${secure} auth=${user ? 'yes' : 'no'} ignoreTLS=${ignoreTls} requireTLS=${requireTls} debug=${debug}`,
  );

  if (!user || !pass) {
    logger.warn(
      `[${scope}] SMTP credentials missing - email sending disabled.`,
    );
    return null;
  }

  let transporter: nodemailer.Transporter | null = null;
  try {
    transporter = nodemailer.createTransport({ ...config, debug });
  } catch (err) {
    logger.error(`[${scope}] Failed to construct transporter`, err as Error);
    return null;
  }

  transporter.verify((error) => {
    if (error) {
      const errorStr = String(error);
      const hints: string[] = [];
      if (/self signed/i.test(errorStr)) {
        hints.push(
          'Self-signed certificate: set SMTP_TLS_REJECT_UNAUTHORIZED=false ONLY in dev.',
        );
      }
      if (/wrong version number/i.test(errorStr)) {
        hints.push('TLS mismatch: 465 => secure=true, 587 => secure=false.');
      }
      if (/certificate/i.test(errorStr) && port === 587 && secure) {
        hints.push(
          'secure=true with port 587 is invalid; use SMTP_SECURE=false.',
        );
      }
      logger.error(`[${scope}] SMTP verification failed:`, error);
      if (hints.length) {
        logger.warn(`[${scope}] Troubleshooting hints:`);
        hints.forEach((h) => logger.warn(` - ${h}`));
      }
    } else {
      logger.log(`[${scope}] SMTP server verified and ready.`);
    }
  });

  return transporter;
}
