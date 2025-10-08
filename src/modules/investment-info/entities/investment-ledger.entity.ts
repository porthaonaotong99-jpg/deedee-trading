import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InvestmentReturns } from './investment-returns.entity';
import { Customer } from '../../customers/entities/customer.entity';

export enum InvestmentLedgerType {
  FUND = 'fund',
  ACCRUAL = 'accrual',
  PAYOUT_INTEREST = 'payout_interest',
  PAYOUT_PRINCIPAL = 'payout_principal',
  ADJUSTMENT = 'adjustment',
  LOSS = 'loss',
  REVERSAL = 'reversal',
  CANCEL = 'cancel',
}

@Entity('investment_ledger')
export class InvestmentLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  investment_returns_id: string;

  @ManyToOne(() => InvestmentReturns, { nullable: false })
  @JoinColumn({ name: 'investment_returns_id' })
  investment_returns: InvestmentReturns;

  @Column({ type: 'uuid', nullable: false })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({
    type: 'enum',
    enum: InvestmentLedgerType,
    nullable: false,
  })
  type: InvestmentLedgerType;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: false,
    comment: 'Transaction amount (always positive)',
  })
  amount: string;

  @Column({
    type: 'char',
    length: 3,
    default: 'USD',
    comment: 'Currency code',
  })
  currency: string;

  @Column({
    type: 'timestamp',
    nullable: false,
    comment: 'Business effective date of transaction',
  })
  effective_at: Date;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional transaction metadata',
  })
  metadata: Record<string, any>;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'Correlation ID for grouped transactions',
  })
  correlation_id: string;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'Who/what created this entry (system|admin_uuid)',
  })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;
}
