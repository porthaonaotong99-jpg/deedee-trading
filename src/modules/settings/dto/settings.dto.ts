import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

// ============================================================================
// User Notification Settings DTOs
// ============================================================================

export class NotificationSettingsDto {
  @ApiProperty({ example: true })
  notify_new_customers: boolean;

  @ApiProperty({ example: true })
  notify_payments: boolean;

  @ApiProperty({ example: true })
  notify_investments: boolean;

  @ApiProperty({ example: true })
  notify_stock_activity: boolean;

  @ApiProperty({ example: true })
  notify_system_alerts: boolean;

  @ApiProperty({ example: false })
  notify_email: boolean;
}

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notify_new_customers?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notify_payments?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notify_investments?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notify_stock_activity?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notify_system_alerts?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  notify_email?: boolean;
}

// ============================================================================
// System Settings DTOs
// ============================================================================

export class SystemSettingDto {
  @ApiProperty({ example: 'maintenance_mode' })
  key: string;

  @ApiProperty({ example: 'false' })
  value: string;

  @ApiProperty({ example: 'boolean' })
  type: string;

  @ApiPropertyOptional({ example: 'system' })
  category?: string;

  @ApiPropertyOptional({ example: 'Enable/disable maintenance mode' })
  description?: string;
}

export class UpdateSystemSettingDto {
  @ApiProperty({ example: 'true' })
  @IsString()
  value!: string;
}

export class CreateSystemSettingDto {
  @ApiProperty({ example: 'maintenance_mode' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'false' })
  @IsString()
  value!: string;

  @ApiPropertyOptional({ example: 'boolean' })
  @IsOptional()
  @IsString()
  type?: 'string' | 'number' | 'boolean' | 'json';

  @ApiPropertyOptional({ example: 'system' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Enable/disable maintenance mode' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
