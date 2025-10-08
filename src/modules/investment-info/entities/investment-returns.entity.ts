import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InvestmentInfo } from './investment-info.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { CustomerService } from '../../customers/entities/customer-service.entity';

export enum InvestmentReturnsStatus {
  PENDING = 'pending',
  INVESTING = 'investing',
  MATURED = 'matured',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DEFAULTED = 'defaulted',
}

@Entity('investment_returns')
export class InvestmentReturns {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  investment_info_id: string;

  @ManyToOne(() => InvestmentInfo, { nullable: false })
  @JoinColumn({ name: 'investment_info_id' })
  investment_info: InvestmentInfo;

  @Column({ type: 'uuid', nullable: false })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'uuid', nullable: true })
  service_id: string;

  @ManyToOne(() => CustomerService, { nullable: true })
  @JoinColumn({ name: 'service_id' })
  service: CustomerService;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    comment: 'Principal amount committed to investment',
  })
  principal_committed: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    comment: 'Principal amount still outstanding',
  })
  principal_outstanding: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    comment: 'Total returns accrued but not yet paid',
  })
  return_accrued: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    comment: 'Returns still outstanding/unpaid',
  })
  return_outstanding: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    comment: 'Total returns paid out to customer',
  })
  return_paid: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When investment started earning returns',
  })
  start_at: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When investment term ends',
  })
  maturity_at: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last accrual calculation date',
  })
  last_accrual_at: Date;

  @Column({
    type: 'enum',
    enum: InvestmentReturnsStatus,
    default: InvestmentReturnsStatus.PENDING,
  })
  status: InvestmentReturnsStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
