import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import {
  RiskTolerance,
  InterestTierName,
} from '../entities/interest-rate-configuration.entity';
import { ReturnRequestType } from '../entities/investment-transaction.entity';

// ===== CUSTOMER INVESTMENT DTOs =====

export class CreateInvestmentRequestDto {
  @ApiProperty({
    description: 'Customer ID (automatically filled from JWT token)',
    example: 'customer-uuid-123',
  })
  @IsString()
  customer_id: string;

  @ApiProperty({
    description: 'Service ID for guaranteed returns service',
    example: 'service-uuid-456',
  })
  @IsString()
  service_id: string;

  @ApiProperty({
    description: 'Investment amount in USD',
    example: 75000,
    minimum: 10000,
  })
  @IsNumber()
  @Min(10000)
  amount: number;

  @ApiProperty({
    description: 'URL to uploaded payment slip image',
    example: 'https://storage.example.com/payment-slips/slip-123.jpg',
  })
  @IsString()
  payment_slip_url: string;

  @ApiProperty({
    description: 'Date when payment was made',
    example: '2025-10-12T10:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  payment_date?: Date;

  @ApiProperty({
    description: 'Additional notes from customer',
    example: 'First time investment, looking for stable returns',
    required: false,
  })
  @IsOptional()
  @IsString()
  customer_notes?: string;

  @ApiProperty({
    description: 'Requested investment period',
    example: '12 months',
    required: false,
  })
  @IsOptional()
  @IsString()
  requested_investment_period?: string;

  @ApiProperty({
    description: 'Customer risk tolerance level',
    example: 'medium',
    enum: ['low', 'medium', 'high', 'conservative', 'moderate', 'aggressive'],
    required: false,
  })
  @IsOptional()
  @IsString()
  requested_risk_tolerance?: string;

  @ApiProperty({
    description: 'Investment goals',
    example: 'Retirement savings with steady growth',
    required: false,
  })
  @IsOptional()
  @IsString()
  requested_investment_goal?: string;
}

export class CreateReturnRequestDto {
  @ApiProperty({
    description: 'Specific investment transaction ID to request return from',
    example: 'transaction-uuid-789',
    required: false,
  })
  @IsOptional()
  @IsString()
  investment_transaction_id?: string;

  @ApiProperty({
    description: 'Type of return request',
    example: 'INTEREST_ONLY',
    enum: ReturnRequestType,
  })
  @IsEnum(ReturnRequestType)
  request_type: ReturnRequestType;

  @ApiProperty({
    description: 'Amount requested for return',
    example: 5000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  requested_amount: number;

  @ApiProperty({
    description: 'Customer reason for return request',
    example: 'Need funds for emergency medical expenses',
    required: false,
  })
  @IsOptional()
  @IsString()
  customer_reason?: string;
}

// ===== ADMIN APPROVAL DTOs =====

export class ApproveInvestmentDto {
  @ApiProperty({
    description: 'Whether to use automatically calculated interest rate',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  use_calculated_rate?: boolean;

  @ApiProperty({
    description: 'Custom interest rate (only if not using calculated rate)',
    example: 0.22,
    minimum: 0,
    maximum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  custom_interest_rate?: number;

  @ApiProperty({
    description: 'Investment term in months',
    example: 12,
    minimum: 1,
    maximum: 60,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  term_months?: number;

  @ApiProperty({
    description: 'Admin notes for the approval',
    example: 'Approved after reviewing payment slip and customer history',
    required: false,
  })
  @IsOptional()
  @IsString()
  admin_notes?: string;
}

export class ApproveReturnDto {
  @ApiProperty({
    description: 'Approved amount for return (can be different from requested)',
    example: 4500,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  approved_amount?: number;

  @ApiProperty({
    description: 'Payment method for return',
    example: 'bank_transfer',
  })
  @IsString()
  payment_method: string;

  @ApiProperty({
    description: 'Payment reference number',
    example: 'RETURN-2025-001234',
  })
  @IsString()
  payment_reference: string;

  @ApiProperty({
    description: 'Admin notes for the return approval',
    example:
      'Emergency return approved, reduced amount due to early withdrawal',
    required: false,
  })
  @IsOptional()
  @IsString()
  admin_notes?: string;
}

// ===== INTEREST RATE CONFIGURATION DTOs =====

export class CreateInterestConfigDto {
  @ApiProperty({
    description: 'Investment tier name',
    example: 'gold',
    enum: InterestTierName,
  })
  @IsEnum(InterestTierName)
  tier_name: InterestTierName;

  @ApiProperty({
    description: 'Minimum investment amount for this tier',
    example: 100000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  min_amount: number;

  @ApiProperty({
    description: 'Maximum investment amount for this tier (null = no limit)',
    example: null,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  max_amount?: number;

  @ApiProperty({
    description: 'Risk tolerance level',
    example: 'high',
    enum: RiskTolerance,
  })
  @IsEnum(RiskTolerance)
  risk_tolerance: RiskTolerance;

  @ApiProperty({
    description: 'Base interest rate (decimal format, e.g., 0.18 = 18%)',
    example: 0.18,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  base_interest_rate: number;

  @ApiProperty({
    description: 'Risk adjustment rate (added to base rate)',
    example: 0.06,
    minimum: -1,
    maximum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  risk_adjustment?: number;

  @ApiProperty({
    description: 'Description of this configuration',
    example: 'Gold tier for high-risk investors seeking maximum returns',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Special conditions or requirements',
    example: 'Minimum 12-month commitment required',
    required: false,
  })
  @IsOptional()
  @IsString()
  conditions?: string;
}

export class UpdateInterestConfigDto {
  @ApiProperty({
    description: 'Updated base interest rate',
    example: 0.2,
    minimum: 0,
    maximum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  base_interest_rate?: number;

  @ApiProperty({
    description: 'Updated risk adjustment rate',
    example: 0.08,
    minimum: -1,
    maximum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  risk_adjustment?: number;

  @ApiProperty({
    description: 'Updated description',
    example: 'Premium Gold tier with enhanced returns for qualified investors',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Updated conditions',
    example: 'Minimum 24-month commitment required for premium rates',
    required: false,
  })
  @IsOptional()
  @IsString()
  conditions?: string;

  @ApiProperty({
    description: 'Whether this configuration is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CalculateRateDto {
  @ApiProperty({
    description: 'Investment amount to calculate rate for',
    example: 125000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Customer risk tolerance level',
    example: 'high',
    enum: RiskTolerance,
  })
  @IsEnum(RiskTolerance)
  risk_tolerance: RiskTolerance;
}

// ===== RESPONSE DTOs =====

export class InterestRateCalculationResponse {
  @ApiProperty({
    description: 'Calculated tier name',
    example: 'gold',
  })
  tier_name: string;

  @ApiProperty({
    description: 'Risk tolerance level used',
    example: 'high',
  })
  risk_tolerance: string;

  @ApiProperty({
    description: 'Base interest rate',
    example: 0.18,
  })
  base_rate: number;

  @ApiProperty({
    description: 'Risk adjustment applied',
    example: 0.06,
  })
  risk_adjustment: number;

  @ApiProperty({
    description: 'Final calculated interest rate',
    example: 0.24,
  })
  final_rate: number;

  @ApiProperty({
    description: 'Human-readable description',
    example: 'GOLD Tier (HIGH Risk): $100,000 - No Limit → 24.0% returns',
  })
  description: string;

  @ApiProperty({
    description: 'Minimum amount for this tier',
    example: 100000,
  })
  min_amount: number;

  @ApiProperty({
    description: 'Maximum amount for this tier',
    example: null,
  })
  max_amount: number | null;
}

export class InvestmentRequestResponse {
  @ApiProperty({
    description: 'Created investment request ID',
    example: 'request-uuid-123',
  })
  request_id: string;

  @ApiProperty({
    description: 'Current status',
    example: 'pending_admin_review',
  })
  status: string;

  @ApiProperty({
    description: 'Calculated tier name',
    example: 'silver',
  })
  calculated_tier: string;

  @ApiProperty({
    description: 'Calculated interest rate',
    example: 0.19,
  })
  calculated_interest_rate: number;

  @ApiProperty({
    description: 'Risk tolerance used',
    example: 'medium',
  })
  risk_tolerance: string;

  @ApiProperty({
    description: 'Base rate component',
    example: 0.15,
  })
  base_rate: number;

  @ApiProperty({
    description: 'Risk adjustment component',
    example: 0.04,
  })
  risk_adjustment: number;

  @ApiProperty({
    description: 'Tier description',
    example: 'SILVER Tier (MEDIUM Risk): $50,000 - $99,999 → 19.0% returns',
  })
  tier_description: string;

  @ApiProperty({
    description: 'Success message',
    example:
      'Investment request submitted successfully. SILVER Tier (MEDIUM Risk): $50,000 - $99,999 → 19.0% returns',
  })
  message: string;
}
