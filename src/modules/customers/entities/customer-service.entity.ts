import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { CustomerKyc } from './customer-kyc.entity';

export enum CustomerServiceType {
  PREMIUM_MEMBERSHIP = 'premium_membership',
  PREMIUM_STOCK_PICKS = 'premium_stock_picks',
  INTERNATIONAL_STOCK_ACCOUNT = 'international_stock_account',
  GUARANTEED_RETURNS = 'guaranteed_returns',
}

export enum SubscriptionDuration {
  THREE_MONTHS = 3,
  SIX_MONTHS = 6,
  TWELVE_MONTHS = 12,
}

export enum CustomerServiceStatus {
  PENDING_PAYMENT = 'pending_payment',
  PENDING_ADMIN_APPROVAL = 'pending_admin_approval',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('customer_services')
export class CustomerService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'enum', enum: CustomerServiceType })
  service_type: CustomerServiceType;

  @Column({
    type: 'enum',
    enum: CustomerServiceStatus,
    default: CustomerServiceStatus.PENDING_PAYMENT,
  })
  status: CustomerServiceStatus;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'boolean', default: false })
  requires_payment: boolean;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Subscription duration in months (3, 6, or 12)',
  })
  subscription_duration: SubscriptionDuration | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When the subscription expires',
  })
  subscription_expires_at: Date | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Subscription fee amount',
  })
  subscription_fee: number | null;

  // Link to the selected subscription package
  @Column({ type: 'uuid', nullable: true })
  subscription_package_id: string | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    comment: 'Available balance for this service (top-ups, debits)',
  })
  balance: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    comment: 'Total invested principal for investment-style services',
  })
  invested_amount: number;

  // KYC record used to approve/activate this service (if any)
  @Column({ type: 'uuid', nullable: true })
  kyc_id: string | null;

  @ManyToOne(() => CustomerKyc, { nullable: true })
  @JoinColumn({ name: 'kyc_id' })
  kyc?: CustomerKyc | null;

  @CreateDateColumn()
  applied_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  status_changed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;
}
