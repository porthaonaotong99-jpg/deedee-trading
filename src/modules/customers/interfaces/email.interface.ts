export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailService {
  sendEmail(options: EmailOptions): Promise<void>;
  sendOtpEmail(data: OtpEmailData): Promise<void>;
  sendResetLinkEmail(data: ResetLinkEmailData): Promise<void>;
}

export interface OtpEmailData {
  email: string;
  otp: string;
  expiresAt: Date;
  customerName?: string;
}

export interface ResetLinkEmailData {
  email: string;
  resetLink: string;
  expiresAt: Date;
  customerName?: string;
}
