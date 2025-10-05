import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsBoolean,
  IsUrl,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  StockPickStatus,
  StockPickAvailability,
} from '../entities/stock-pick.entity';
import { CustomerServiceType } from '../../customers/entities/customer-service.entity';
import { CustomerPickStatus } from '../entities/customer-stock-pick.entity';

export class CreateStockPickDto {
  @ApiProperty({
    description: 'Stock symbol (e.g., AAPL, GOOGL)',
    example: 'AAPL',
    minLength: 1,
    maxLength: 20,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : (value as string),
  )
  stock_symbol: string;

  @ApiProperty({
    description: 'Description of the stock pick for customers',
    example: 'Strong tech stock with growth potential',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description: string;

  @ApiProperty({
    description: 'Status of the stock pick',
    enum: StockPickStatus,
    example: StockPickStatus.GOOD,
  })
  @IsEnum(StockPickStatus)
  status: StockPickStatus;

  @ApiProperty({
    description: 'Service type this pick is associated with',
    enum: CustomerServiceType,
    example: CustomerServiceType.PREMIUM_STOCK_PICKS,
  })
  @IsEnum(CustomerServiceType)
  service_type: CustomerServiceType;

  @ApiPropertyOptional({
    description: 'Internal notes for admin reference',
    example: 'Based on Q3 earnings report',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  admin_notes?: string;

  @ApiPropertyOptional({
    description: 'Target price for the stock',
    example: 150,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  target_price?: number;

  @ApiPropertyOptional({
    description: 'Current price of the stock',
    example: 145.5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  current_price?: number;

  @ApiPropertyOptional({
    description: 'When this pick expires (ISO date string)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string;
}

export class UpdateStockPickDto {
  @ApiPropertyOptional({
    description: 'Updated description',
    minLength: 10,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated status',
    enum: StockPickStatus,
  })
  @IsOptional()
  @IsEnum(StockPickStatus)
  status?: StockPickStatus;

  @ApiPropertyOptional({
    description: 'Updated availability',
    enum: StockPickAvailability,
  })
  @IsOptional()
  @IsEnum(StockPickAvailability)
  availability?: StockPickAvailability;

  @ApiPropertyOptional({
    description: 'Updated admin notes',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  admin_notes?: string;

  @ApiPropertyOptional({
    description: 'Updated target price',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  target_price?: number;

  @ApiPropertyOptional({
    description: 'Updated current price',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  current_price?: number;

  @ApiPropertyOptional({
    description: 'Updated expiration date',
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @ApiPropertyOptional({
    description: 'Whether the pick is active',
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CustomerSubmitPaymentSlipDto {
  @ApiProperty({
    description: 'URL to the payment slip image/document',
    example: 'https://example.com/uploads/payment-slip-123.jpg',
  })
  @IsString()
  @IsUrl()
  payment_slip_url: string;

  @ApiProperty({
    description: 'Original filename of the payment slip',
    example: 'payment-slip-bank-transfer.jpg',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  payment_slip_filename: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 100,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  payment_amount: number;

  @ApiPropertyOptional({
    description: 'Payment reference number',
    example: 'TXN123456789',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  payment_reference?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the payment',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  payment_notes?: string;
}

export class AdminApprovePickDto {
  @ApiProperty({
    description: 'Admin response message to customer',
    example: 'Great choice! This stock has strong fundamentals.',
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  admin_response: string;

  @ApiPropertyOptional({
    description: 'Whether to approve or reject the pick',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  approve?: boolean;
}

export class StockPickFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by service type',
    enum: CustomerServiceType,
  })
  @IsOptional()
  @IsEnum(CustomerServiceType)
  service_type?: CustomerServiceType;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: StockPickStatus,
  })
  @IsOptional()
  @IsEnum(StockPickStatus)
  status?: StockPickStatus;

  @ApiPropertyOptional({
    description: 'Filter by availability',
    enum: StockPickAvailability,
  })
  @IsOptional()
  @IsEnum(StockPickAvailability)
  availability?: StockPickAvailability;

  @ApiPropertyOptional({
    description: 'Filter by active status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }): boolean | undefined => {
    if (typeof value === 'string') {
      if (value === 'true') return true;
      if (value === 'false') return false;
    }
    return value as boolean | undefined;
  })
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Transform(({ value }): number | undefined => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? undefined : num;
    }
    return value as number | undefined;
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }): number | undefined => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? undefined : num;
    }
    return value as number | undefined;
  })
  limit?: number;
}

// Customer-specific filter DTO (minimal filters - pagination only)
export class CustomerStockPickFilterDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Transform(({ value }): number | undefined => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? undefined : num;
    }
    return value as number | undefined;
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Transform(({ value }): number | undefined => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? undefined : num;
    }
    return value as number | undefined;
  })
  limit?: number;
}

// Response DTOs
export class StockPickResponseDto {
  @ApiProperty({ description: 'Unique ID of the stock pick' })
  id: string;

  @ApiProperty({ description: 'Stock symbol' })
  stock_symbol: string;

  @ApiProperty({ description: 'Description of the stock pick' })
  description: string;

  @ApiProperty({ description: 'Status', enum: StockPickStatus })
  status: StockPickStatus;

  @ApiProperty({ description: 'Availability', enum: StockPickAvailability })
  availability: StockPickAvailability;

  @ApiProperty({ description: 'Service type', enum: CustomerServiceType })
  service_type: CustomerServiceType;

  @ApiProperty({ description: 'Admin who created this pick' })
  created_by_admin_id: string;

  @ApiPropertyOptional({ description: 'Admin notes' })
  admin_notes?: string;

  @ApiPropertyOptional({ description: 'Target price' })
  target_price?: number;

  @ApiPropertyOptional({ description: 'Current price' })
  current_price?: number;

  @ApiPropertyOptional({ description: 'Expiration date' })
  expires_at?: Date;

  @ApiProperty({ description: 'Whether the pick is active' })
  is_active: boolean;

  @ApiProperty({ description: 'Creation date' })
  created_at: Date;

  @ApiProperty({ description: 'Last update date' })
  updated_at: Date;
}

export class CustomerStockPickResponseDto {
  @ApiProperty({ description: 'Unique ID of the customer pick' })
  id: string;

  @ApiProperty({ description: 'Customer ID' })
  customer_id: string;

  @ApiProperty({ description: 'Stock pick ID' })
  stock_pick_id: string;

  @ApiProperty({ description: 'Pick status', enum: CustomerPickStatus })
  status: CustomerPickStatus;

  @ApiPropertyOptional({
    description: 'Stock symbol (only shown when approved)',
    example: 'AAPL',
  })
  stock_symbol?: string;

  @ApiPropertyOptional({ description: 'Customer notes' })
  customer_notes?: string;

  @ApiPropertyOptional({ description: 'Admin response' })
  admin_response?: string;

  @ApiPropertyOptional({ description: 'Payment slip URL' })
  payment_slip_url?: string;

  @ApiPropertyOptional({ description: 'Payment slip filename' })
  payment_slip_filename?: string;

  @ApiPropertyOptional({ description: 'Payment amount' })
  payment_amount?: number;

  @ApiPropertyOptional({ description: 'Payment reference' })
  payment_reference?: string;

  @ApiPropertyOptional({ description: 'Payment submitted date' })
  payment_submitted_at?: Date;

  @ApiPropertyOptional({ description: 'Admin who approved' })
  approved_by_admin_id?: string;

  @ApiPropertyOptional({ description: 'Approval date' })
  approved_at?: Date;

  @ApiPropertyOptional({ description: 'Email sent date' })
  email_sent_at?: Date;

  @ApiProperty({ description: 'Selection date' })
  selected_at: Date;

  @ApiProperty({ description: 'Last update date' })
  updated_at: Date;
}

// Filtered response for customers (no stock symbol revealed)
export class CustomerViewStockPickDto {
  @ApiProperty({ description: 'Unique ID of the stock pick' })
  id: string;

  @ApiProperty({ description: 'Description of the stock pick' })
  description: string;

  @ApiProperty({ description: 'Status', enum: StockPickStatus })
  status: StockPickStatus;

  @ApiProperty({ description: 'Service type', enum: CustomerServiceType })
  service_type: CustomerServiceType;

  @ApiPropertyOptional({ description: 'Target price' })
  target_price?: number;

  @ApiPropertyOptional({ description: 'Current price' })
  current_price?: number;

  @ApiPropertyOptional({ description: 'Expiration date' })
  expires_at?: Date;

  @ApiProperty({ description: 'Creation date' })
  created_at: Date;

  // Note: stock_symbol is intentionally excluded for security
  @ApiProperty({
    description:
      'Whether the authenticated customer has an active (non-rejected) selection for this pick',
  })
  is_selected: boolean;
}
