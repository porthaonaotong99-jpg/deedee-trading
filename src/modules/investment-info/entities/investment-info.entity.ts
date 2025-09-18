import { InvestmentInfoStatus, RiskTolerance } from 'src/common/enums';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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
