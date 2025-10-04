import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Payment } from './payment.entity';
import { Customer } from './customer.entity';

export enum PaymentAuditAction {
  PAYMENT_CREATED = 'payment_created',
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_PROCESSING = 'payment_processing',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_CANCELED = 'payment_canceled',
  PAYMENT_REFUNDED = 'payment_refunded',
  PAYMENT_PARTIALLY_REFUNDED = 'payment_partially_refunded',
  PAYMENT_URL_GENERATED = 'payment_url_generated',
  PAYMENT_URL_ACCESSED = 'payment_url_accessed',
  SUBSCRIPTION_ACTIVATED = 'subscription_activated',
  SUBSCRIPTION_RENEWAL_REQUESTED = 'subscription_renewal_requested',
  SUBSCRIPTION_RENEWAL_ACTIVATED = 'subscription_renewal_activated',
  SUBSCRIPTION_EXPIRED = 'subscription_expired',
  ADMIN_APPROVAL_PENDING = 'admin_approval_pending',
  ADMIN_APPROVED = 'admin_approved',
  ADMIN_REJECTED = 'admin_rejected',
}

export enum PaymentAuditLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

@Entity('payment_audit_logs')
export class PaymentAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  payment_id: string;

  @ManyToOne(() => Payment, { nullable: false })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ type: 'uuid' })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'enum', enum: PaymentAuditAction })
  action: PaymentAuditAction;

  @Column({
    type: 'enum',
    enum: PaymentAuditLevel,
    default: PaymentAuditLevel.INFO,
  })
  level: PaymentAuditLevel;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  user_agent: string | null;

  @Column({ type: 'inet', nullable: true })
  ip_address: string | null;

  @Column({ type: 'uuid', nullable: true })
  performed_by: string | null; // Admin user ID if action was performed by admin

  @Column({ type: 'varchar', length: 255, nullable: true })
  external_reference: string | null; // External payment provider reference

  @CreateDateColumn()
  created_at: Date;
}
