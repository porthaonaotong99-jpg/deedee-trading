import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PasswordResetMethod {
  EMAIL_LINK = 'email_link',
  EMAIL_OTP = 'email_otp',
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'Customer email address to send reset instructions',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiPropertyOptional({
    enum: PasswordResetMethod,
    default: PasswordResetMethod.EMAIL_OTP,
    description: 'Preferred method for password reset (OTP or link)',
  })
  @IsOptional()
  @IsEnum(PasswordResetMethod, {
    message: 'Method must be either email_link or email_otp',
  })
  method?: PasswordResetMethod;
}

export class ResetPasswordWithOtpDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'Customer email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'OTP code received via email (6 digits)',
  })
  @IsString({ message: 'OTP must be a string' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp: string;

  @ApiProperty({
    example: 'NewSecureP@ss123!',
    description:
      'New password (minimum 10 characters with complexity requirements)',
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(10, { message: 'Password must be at least 10 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
  })
  new_password: string;
}

export class ResetPasswordWithTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Password reset token from email link',
  })
  @IsString({ message: 'Reset token must be a string' })
  @IsNotEmpty({ message: 'Reset token is required' })
  reset_token: string;

  @ApiProperty({
    example: 'NewSecureP@ss123!',
    description:
      'New password (minimum 10 characters with complexity requirements)',
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(10, { message: 'Password must be at least 10 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
  })
  new_password: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({
    example: 'success',
    description: 'Status of the request',
  })
  status: string;

  @ApiProperty({
    example: 'Password reset instructions sent to your email',
    description: 'Success message',
  })
  message: string;

  @ApiPropertyOptional({
    example: '2024-10-02T10:30:00Z',
    description: 'When the reset token/OTP expires (ISO 8601 format)',
  })
  expires_at?: string;

  @ApiProperty({
    enum: PasswordResetMethod,
    example: PasswordResetMethod.EMAIL_OTP,
    description: 'Method used for password reset',
  })
  method: PasswordResetMethod;
}

export class ResetPasswordResponseDto {
  @ApiProperty({
    example: 'success',
    description: 'Status of the password reset',
  })
  status: string;

  @ApiProperty({
    example: 'Password reset successfully',
    description: 'Success message',
  })
  message: string;

  @ApiProperty({
    example: '2024-10-02T10:30:00Z',
    description: 'When the password was reset (ISO 8601 format)',
  })
  reset_at: string;
}
