import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InvestmentRequest } from './investment-request.entity';
import { Customer } from '../../customers/entities/customer.entity';

export enum TransactionType {
  INVESTMENT_APPROVED = 'investment_approved', // When request is approved
  INTEREST_CALCULATED = 'interest_calculated', // Interest accrual
  INTEREST_PAID = 'interest_paid', // Interest paid to customer
  PRINCIPAL_RETURNED = 'principal_returned', // Principal returned to customer
  RETURN_REQUEST = 'return_request', // Customer requests money
  RETURN_APPROVED = 'return_approved', // Admin approves return
  RETURN_PAID = 'return_paid', // Money sent to customer
  ADJUSTMENT = 'adjustment', // Manual adjustments
}

export enum ReturnRequestType {
  INTEREST_ONLY = 'interest_only',
  PARTIAL_PRINCIPAL = 'partial_principal',
  FULL_WITHDRAWAL = 'full_withdrawal',
}

export enum ReturnRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
}

/**
 * TABLE 3: Investment Transactions (Individual Investments + Return Requests)
 * Purpose: Track each individual investment and all money movements
 * Each approved request becomes an individual investment record here
 */
@Entity('investment_transactions')
export class InvestmentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Link to original request
  @Column({ type: 'uuid', nullable: false })
  request_id: string;

  @ManyToOne(() => InvestmentRequest, { nullable: false })
  @JoinColumn({ name: 'request_id' })
  request: InvestmentRequest;

  @Column({ type: 'uuid', nullable: false })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  // === INDIVIDUAL INVESTMENT TRACKING ===
  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
    comment: 'For investment_approved: original amount invested',
  })
  investment_principal: string | null;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
    comment: 'Current remaining principal for this investment',
  })
  current_principal: string | null;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 6,
    nullable: true,
    comment: 'Interest rate for this investment',
  })
  interest_rate: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When this investment started',
  })
  investment_start_date: Date | null;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Investment term in months',
  })
  term_months: number | null;

  // === TRANSACTION DETAILS ===
  @Column({ type: 'enum', enum: TransactionType, nullable: false })
  transaction_type: TransactionType;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: false })
  amount: string;

  @Column({ type: 'timestamp', nullable: false })
  effective_date: Date;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // === RETURN REQUEST FIELDS ===
  @Column({ type: 'enum', enum: ReturnRequestType, nullable: true })
  return_request_type: ReturnRequestType | null;

  @Column({ type: 'enum', enum: ReturnRequestStatus, nullable: true })
  return_request_status: ReturnRequestStatus | null;

  @Column({ type: 'text', nullable: true })
  customer_reason: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  admin_notes: string | null;

  @Column({ type: 'varchar', nullable: true })
  payment_method: string | null;

  @Column({ type: 'varchar', nullable: true })
  payment_reference: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'interest_rate_configurations.id applied to this transaction',
  })
  interest_rate_config_id: string | null;

  @CreateDateColumn()
  @CreateDateColumn()
  created_at: Date;
}
