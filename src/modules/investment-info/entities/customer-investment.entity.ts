import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { CustomerService } from '../../customers/entities/customer-service.entity';

/**
 * TABLE 2: Customer Investment Summary (Per Customer Totals)
 * Purpose: Store aggregated totals for each customer
 * One record per customer - tracks all their investment totals
 */
@Entity('customer_investment_summary')
@Index(['customer_id', 'service_id'], { unique: true })
export class CustomerInvestmentSummary {
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

  // === INVESTMENT COUNTS ===
  @Column({ type: 'int', default: 0 })
  total_investment_requests: number;

  @Column({ type: 'int', default: 0 })
  approved_investments: number;

  @Column({ type: 'int', default: 0 })
  active_investments: number;

  @Column({ type: 'int', default: 0 })
  completed_investments: number;

  // === TOTAL AMOUNTS ===
  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: '0.00',
    comment: 'Total amount ever invested by this customer',
  })
  total_original_investment: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: '0.00',
    comment: 'Current remaining principal across all active investments',
  })
  total_current_balance: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: '0.00',
    comment: 'Total interest calculated/earned across all investments',
  })
  total_interest_earned: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: '0.00',
    comment: 'Total interest actually paid out to customer',
  })
  total_interest_paid: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: '0.00',
    comment: 'Total principal returned to customer',
  })
  total_principal_returned: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: '0.00',
    comment: 'Outstanding interest owed to customer (earned - paid)',
  })
  outstanding_interest: string;

  // === DATES ===
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Date of first investment',
  })
  first_investment_date: Date | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Date of latest investment',
  })
  last_investment_date: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

// For backward compatibility
export const CustomerInvestment = CustomerInvestmentSummary;
