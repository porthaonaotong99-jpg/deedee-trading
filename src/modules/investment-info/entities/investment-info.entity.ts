import { InvestmentInfoStatus, RiskTolerance } from 'src/common/enums';
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

@Entity('investment_info')
export class InvestmentInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'float', nullable: true })
  amount: number;

  @Column({ type: 'float', nullable: true })
  profit: number;

  @Column({ type: 'float', nullable: true })
  interest_rate: number;

  @Column({ type: 'float', nullable: true })
  total: number;

  @Column({ type: 'int', nullable: true })
  period: number;

  @Column({ type: 'enum', enum: RiskTolerance, nullable: true })
  risk_tolerance: RiskTolerance;

  @Column({ type: 'varchar', nullable: true })
  investment_goal: string;

  @Column({ type: 'varchar', nullable: true })
  expected_annual_returns: string;

  @Column({ type: 'varchar', nullable: true })
  noted: string;

  @Column({ type: 'varchar', nullable: true })
  payment_slip: string;

  @Column({ type: 'varchar', nullable: true })
  payment_type: string;

  // Relations / Foreign Keys (nullable initially until data backfilled)
  @Column({ type: 'uuid', nullable: true })
  customer_id: string | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer | null;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'Target customer service (guaranteed_returns)',
  })
  service_id: string | null;

  @ManyToOne(() => CustomerService, { nullable: true })
  @JoinColumn({ name: 'service_id' })
  service?: CustomerService | null;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  rejected_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  rejected_at: Date | null;

  @Column({
    type: 'enum',
    enum: InvestmentInfoStatus,
    default: InvestmentInfoStatus.PENDING,
  })
  status: InvestmentInfoStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
