import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TwoFactorService {
  private readonly appName: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.appName = this.configService.get<string>('APP_NAME', 'PhaJaoInvest');

    // Configure authenticator
    authenticator.options = {
      digits: 6,
      step: 30, // 30 seconds
      window: 1, // Allow 1 step before/after for clock drift
    };
  }

  /**
   * Generate a new 2FA secret for a user
   */
  async generateSecret(userId: string): Promise<{
    secret: string;
    qrCode: string;
    manualEntryKey: string;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.two_factor_enabled) {
      throw new BadRequestException(
        '2FA is already enabled. Disable it first to set up a new one.',
      );
    }

    // Generate a new secret
    const secret = authenticator.generateSecret();

    // Create the otpauth URL
    const otpauthUrl = authenticator.keyuri(
      user.username,
      this.appName,
      secret,
    );

    // Generate QR code
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // Format the secret for manual entry (groups of 4)
    const manualEntryKey = secret.match(/.{1,4}/g)?.join(' ') || secret;

    // Store the secret temporarily (not enabled yet)
    user.two_factor_secret = secret;
    await this.userRepository.save(user);

    return {
      secret,
      qrCode,
      manualEntryKey,
    };
  }

  /**
   * Verify a TOTP code and enable 2FA
   */
  async enableTwoFactor(
    userId: string,
    code: string,
  ): Promise<{
    enabled: boolean;
    backup_codes: string[];
    message: string;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.two_factor_enabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    if (!user.two_factor_secret) {
      throw new BadRequestException(
        'Please set up 2FA first by calling the setup endpoint',
      );
    }

    // Verify the code
    const isValid = authenticator.verify({
      token: code,
      secret: user.two_factor_secret || '',
    });

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Enable 2FA
    user.two_factor_enabled = true;
    user.two_factor_backup_codes = backupCodes.map((c) =>
      this.hashBackupCode(c),
    );
    await this.userRepository.save(user);

    return {
      enabled: true,
      backup_codes: backupCodes, // Return plain codes to user (only time they see them)
      message:
        '2FA has been enabled successfully. Save your backup codes securely.',
    };
  }

  /**
   * Disable 2FA for a user
   */
  async disableTwoFactor(
    userId: string,
    password: string,
    code?: string,
    backupCode?: string,
  ): Promise<{ disabled: boolean; message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.two_factor_enabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Verify password (imported from auth service pattern)
    const bcrypt = await import('bcryptjs');
    const argon2 = await import('argon2');

    let passwordValid = false;
    if (user.password.startsWith('$argon2')) {
      passwordValid = await argon2.verify(user.password, password);
    } else {
      passwordValid = await bcrypt.compare(password, user.password);
    }

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify either TOTP code or backup code
    if (code) {
      const isValid = authenticator.verify({
        token: code,
        secret: user.two_factor_secret || '',
      });
      if (!isValid) {
        throw new BadRequestException('Invalid verification code');
      }
    } else if (backupCode) {
      const isValidBackup = this.verifyBackupCode(user, backupCode);
      if (!isValidBackup) {
        throw new BadRequestException('Invalid backup code');
      }
    } else {
      throw new BadRequestException(
        'Please provide either a TOTP code or backup code',
      );
    }

    // Disable 2FA
    user.two_factor_enabled = false;
    user.two_factor_secret = '';
    user.two_factor_backup_codes = [];
    await this.userRepository.save(user);

    return {
      disabled: true,
      message: '2FA has been disabled successfully',
    };
  }

  /**
   * Verify a TOTP code for login
   */
  async verifyTOTP(userId: string, code: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
      return false;
    }

    const secret = user.two_factor_secret;
    return authenticator.verify({
      token: code,
      secret,
    });
  }

  /**
   * Verify and consume a backup code
   */
  async verifyAndConsumeBackupCode(
    userId: string,
    code: string,
  ): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.two_factor_enabled) {
      return false;
    }

    const hashedCode = this.hashBackupCode(
      code.toUpperCase().replace(/\s/g, ''),
    );
    const backupCodes: string[] = user.two_factor_backup_codes || [];
    const codeIndex = backupCodes.findIndex((c: string) => c === hashedCode);

    if (codeIndex === -1) {
      return false;
    }

    // Remove the used backup code
    backupCodes.splice(codeIndex, 1);
    user.two_factor_backup_codes = backupCodes;
    await this.userRepository.save(user);

    return true;
  }

  /**
   * Get 2FA status for a user
   */
  async getStatus(userId: string): Promise<{
    enabled: boolean;
    backup_codes_remaining: number;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      enabled: user.two_factor_enabled,
      backup_codes_remaining: user.two_factor_backup_codes?.length || 0,
    };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(
    userId: string,
    code: string,
  ): Promise<{
    backup_codes: string[];
    message: string;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.two_factor_enabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Verify the TOTP code
    const isValid = authenticator.verify({
      token: code,
      secret: user.two_factor_secret || '',
    });

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();
    user.two_factor_backup_codes = backupCodes.map((c) =>
      this.hashBackupCode(c),
    );
    await this.userRepository.save(user);

    return {
      backup_codes: backupCodes,
      message: 'Backup codes have been regenerated. Save them securely.',
    };
  }

  /**
   * Create a temporary token for 2FA login flow
   */
  createTempToken(userId: string): string {
    const secret =
      this.configService.get<string>('JWT_ADMIN_SECRET') ||
      this.configService.get<string>('JWT_SECRET', 'your-secret-key');

    return this.jwtService.sign(
      { sub: userId, type: '2fa_pending' },
      { secret, expiresIn: '5m' }, // 5 minutes to complete 2FA
    );
  }

  /**
   * Verify a temporary token
   */
  verifyTempToken(token: string): { userId: string } | null {
    try {
      const secret =
        this.configService.get<string>('JWT_ADMIN_SECRET') ||
        this.configService.get<string>('JWT_SECRET', 'your-secret-key');

      const payload = this.jwtService.verify(token, { secret });

      if (payload.type !== '2fa_pending') {
        return null;
      }

      return { userId: payload.sub };
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  private hashBackupCode(code: string): string {
    return crypto
      .createHash('sha256')
      .update(code.toUpperCase().replace(/\s/g, ''))
      .digest('hex');
  }

  private verifyBackupCode(user: User, code: string): boolean {
    const hashedCode = this.hashBackupCode(code);
    return user.two_factor_backup_codes?.includes(hashedCode) || false;
  }
}
