import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

// ============================================================================
// 2FA Setup DTOs
// ============================================================================

export class Setup2FAResponseDto {
  @ApiProperty({ description: 'Secret key for authenticator app' })
  secret: string;

  @ApiProperty({ description: 'QR code data URL for scanning' })
  qrCode: string;

  @ApiProperty({ description: 'Manual entry key (formatted)' })
  manualEntryKey: string;
}

export class Verify2FADto {
  @ApiProperty({
    example: '123456',
    description: '6-digit code from authenticator app',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code!: string;
}

export class Enable2FADto extends Verify2FADto {}

export class Disable2FADto {
  @ApiProperty({
    example: 'YourPassword123',
    description: 'Current password for verification',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({
    example: '123456',
    description:
      '6-digit code from authenticator app (optional if using backup code)',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    example: 'ABCD1234',
    description: 'Backup code (optional if using authenticator code)',
  })
  @IsOptional()
  @IsString()
  backup_code?: string;
}

export class Enable2FAResponseDto {
  @ApiProperty({ description: 'Whether 2FA was successfully enabled' })
  enabled: boolean;

  @ApiProperty({
    description: 'Backup codes for account recovery',
    type: [String],
  })
  backup_codes: string[];

  @ApiProperty({ description: 'Message' })
  message: string;
}

export class Disable2FAResponseDto {
  @ApiProperty({ description: 'Whether 2FA was successfully disabled' })
  disabled: boolean;

  @ApiProperty({ description: 'Message' })
  message: string;
}

// ============================================================================
// 2FA Login DTOs
// ============================================================================

export class Login2FADto {
  @ApiProperty({
    example: 'admin',
    description: 'Username',
  })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    example: 'Password123',
    description: 'Password',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({
    example: '123456',
    description: '6-digit code from authenticator app',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  totp_code?: string;

  @ApiPropertyOptional({
    example: 'ABCD1234',
    description: 'Backup code for recovery',
  })
  @IsOptional()
  @IsString()
  backup_code?: string;
}

export class Login2FARequiredResponseDto {
  @ApiProperty({ description: 'Indicates 2FA is required' })
  requires_2fa: boolean;

  @ApiProperty({ description: 'Temporary token for 2FA verification' })
  temp_token: string;

  @ApiProperty({ description: 'Message' })
  message: string;
}

export class Verify2FALoginDto {
  @ApiProperty({
    description: 'Temporary token from initial login',
  })
  @IsString()
  @IsNotEmpty()
  temp_token!: string;

  @ApiPropertyOptional({
    example: '123456',
    description: '6-digit code from authenticator app',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  totp_code?: string;

  @ApiPropertyOptional({
    example: 'ABCD1234',
    description: 'Backup code for recovery',
  })
  @IsOptional()
  @IsString()
  backup_code?: string;
}

// ============================================================================
// 2FA Status DTOs
// ============================================================================

export class TwoFactorStatusDto {
  @ApiProperty({ description: 'Whether 2FA is enabled for this user' })
  enabled: boolean;

  @ApiProperty({ description: 'Number of remaining backup codes' })
  backup_codes_remaining: number;
}

export class RegenerateBackupCodesDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit code from authenticator app for verification',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code!: string;
}

// Alias for controller usage
export class Regenerate2FADto extends RegenerateBackupCodesDto {}

export class RegenerateBackupCodesResponseDto {
  @ApiProperty({ description: 'New backup codes', type: [String] })
  backup_codes: string[];

  @ApiProperty({ description: 'Message' })
  message: string;
}

// ============================================================================
// 2FA Login Complete DTO
// ============================================================================

export class LoginWith2FADto {
  @ApiProperty({
    description: 'Temporary token from initial login',
  })
  @IsString()
  @IsNotEmpty()
  temp_token!: string;

  @ApiPropertyOptional({
    example: '123456',
    description: '6-digit code from authenticator app',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code?: string;

  @ApiPropertyOptional({
    example: 'ABCD1234',
    description: 'Backup code for recovery',
  })
  @IsOptional()
  @IsString()
  backup_code?: string;
}
