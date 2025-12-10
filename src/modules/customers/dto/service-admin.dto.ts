import { ApiProperty } from '@nestjs/swagger';
import {
  CustomerServiceType,
  SubscriptionDuration,
} from '../entities/customer-service.entity';
import { PaymentStatus } from '../../payments/entities/payment.entity';
import { KycStatus, KycLevel } from '../entities/customer-kyc.entity';

export class PendingServiceApplicationDto {
  @ApiProperty({ description: 'Service ID' })
  service_id: string;

  @ApiProperty({ description: 'Customer ID' })
  customer_id: string;

  @ApiProperty({
    description: 'Customer information',
    type: 'object',
    properties: {
      username: { type: 'string' },
      email: { type: 'string' },
      first_name: { type: 'string' },
      last_name: { type: 'string' },
      phone_number: { type: 'string', nullable: true },
    },
  })
  customer_info: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  };

  @ApiProperty({
    enum: CustomerServiceType,
    description: 'Type of service applied for',
  })
  service_type: CustomerServiceType;

  @ApiProperty({ description: 'Service is currently active', type: 'boolean' })
  active: boolean;

  @ApiProperty({ description: 'Service requires payment', type: 'boolean' })
  requires_payment: boolean;

  @ApiProperty({
    description: 'Subscription duration in months (if applicable)',
    enum: SubscriptionDuration,
    nullable: true,
  })
  subscription_duration: SubscriptionDuration | null;

  @ApiProperty({
    description: 'Subscription fee amount',
    type: 'number',
    nullable: true,
  })
  subscription_fee: number | null;

  @ApiProperty({ description: 'Subscription expires at', nullable: true })
  subscription_expires_at: Date | null;

  @ApiProperty({ description: 'When service was applied for' })
  applied_at: Date;

  @ApiProperty({
    description: 'Payment information (if requires_payment)',
    type: 'object',
    nullable: true,
    properties: {
      payment_id: { type: 'string' },
      amount: { type: 'number' },
      paid_at: { type: 'string', format: 'date-time', nullable: true },
      status: { enum: Object.values(PaymentStatus) },
      payment_slip_url: { type: 'string', nullable: true },
    },
  })
  payment_info?: {
    payment_id: string;
    amount: number;
    paid_at: Date | null;
    status: PaymentStatus;
    payment_slip_url?: string;
  };

  @ApiProperty({
    description: 'KYC information (if service requires KYC)',
    type: 'object',
    nullable: true,
    properties: {
      kyc_id: { type: 'string' },
      kyc_level: { enum: Object.values(KycLevel) },
      kyc_status: { enum: Object.values(KycStatus) },
      reviewed_at: { type: 'string', format: 'date-time', nullable: true },
    },
  })
  kyc_info?: {
    kyc_id: string;
    kyc_level: KycLevel;
    kyc_status: KycStatus;
    reviewed_at: Date | null;
  };
}

export class ServiceApplicationStatsDto {
  @ApiProperty({ description: 'Service type' })
  service_type: CustomerServiceType;

  @ApiProperty({ description: 'Total pending applications' })
  total_pending: number;

  @ApiProperty({ description: 'Pending with payment submitted' })
  pending_with_payment: number;

  @ApiProperty({ description: 'Pending KYC review' })
  pending_kyc_review: number;

  @ApiProperty({ description: 'Total approved this month' })
  approved_this_month: number;

  @ApiProperty({ description: 'Total rejected this month' })
  rejected_this_month: number;

  @ApiProperty({
    description: 'Average approval time in hours',
    nullable: true,
  })
  avg_approval_time_hours: number | null;
}

export class AllServicesStatsDto {
  @ApiProperty({
    description: 'Stats by service type',
    type: [ServiceApplicationStatsDto],
  })
  by_service: ServiceApplicationStatsDto[];

  @ApiProperty({ description: 'Total pending across all services' })
  total_pending: number;

  @ApiProperty({ description: 'Total active services' })
  total_active: number;
}

export class BulkApprovalDto {
  @ApiProperty({
    description: 'Array of service IDs to approve',
    type: [String],
  })
  service_ids: string[];

  @ApiProperty({
    description: 'Admin notes for bulk approval',
    required: false,
  })
  admin_notes?: string;
}

export class BulkApprovalResultDto {
  @ApiProperty({ description: 'Successfully approved service IDs' })
  approved: string[];

  @ApiProperty({ description: 'Failed approvals with reasons' })
  failed: Array<{ service_id: string; reason: string }>;

  @ApiProperty({ description: 'Total processed' })
  total_processed: number;

  @ApiProperty({ description: 'Total succeeded' })
  total_succeeded: number;

  @ApiProperty({ description: 'Total failed' })
  total_failed: number;
}

export class ServiceFilterQueryDto {
  @ApiProperty({
    description: 'Filter by service type',
    enum: CustomerServiceType,
    required: false,
  })
  service_type?: CustomerServiceType;

  @ApiProperty({
    description: 'Filter by active status',
    type: 'boolean',
    required: false,
  })
  active?: boolean;

  @ApiProperty({
    description: 'Filter by payment status',
    enum: PaymentStatus,
    required: false,
  })
  payment_status?: PaymentStatus;

  @ApiProperty({
    description: 'Filter by KYC status',
    enum: KycStatus,
    required: false,
  })
  kyc_status?: KycStatus;

  @ApiProperty({
    description: 'Page number (1-based)',
    type: 'number',
    required: false,
    default: 1,
  })
  page?: number;

  @ApiProperty({
    description: 'Items per page',
    type: 'number',
    required: false,
    default: 20,
  })
  limit?: number;

  @ApiProperty({
    description: 'Search by customer name or email',
    type: 'string',
    required: false,
  })
  search?: string;
}
