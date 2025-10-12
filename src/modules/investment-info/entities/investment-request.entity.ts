import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { CustomerService } from '../../customers/entities/customer-service.entity';

export enum InvestmentRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * TABLE 1: Investment Requests with Payment Slips
 * Purpose: Customer uploads payment slip → Admin reviews → Approve/Reject
 */
@Entity('investment_requests')
export class InvestmentRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'uuid', nullable: false })
  service_id: string;

  @ManyToOne(() => CustomerService, { nullable: false })
  @JoinColumn({ name: 'service_id' })
  service: CustomerService;

  @Column({ type: 'varchar', nullable: false })
  payment_slip_url: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: false })
  amount: string;

  @Column({ type: 'timestamp', nullable: true })
  payment_date: Date | null;

  @Column({ type: 'text', nullable: true })
  customer_notes: string | null;

  // === INVESTMENT PREFERENCES (from form) ===
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Investment period selected by customer',
  })
  requested_investment_period: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Risk tolerance selected by customer',
  })
  requested_risk_tolerance: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Investment goal selected by customer',
  })
  requested_investment_goal: string | null;

  // === AUTO-CALCULATED INTEREST TIER ===
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Auto-calculated tier: bronze, silver, gold',
  })
  calculated_tier: string | null;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 6,
    nullable: true,
    comment: 'Auto-calculated interest rate based on amount',
  })
  calculated_interest_rate: string | null;

  @Column({
    type: 'enum',
    enum: InvestmentRequestStatus,
    default: InvestmentRequestStatus.PENDING,
  })
  status: InvestmentRequestStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'numeric', precision: 8, scale: 6, nullable: true })
  approved_interest_rate: string | null;

  @Column({ type: 'int', nullable: true })
  approved_term_months: number | null;

  @Column({ type: 'text', nullable: true })
  admin_notes: string | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
