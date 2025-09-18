import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import {
  EmploymentStatus,
  MaritalStatus,
  RiskTolerance,
} from '../../../common/enums';

export enum KycStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum KycLevel {
  BASIC = 'basic',
  ADVANCED = 'advanced',
  BROKERAGE = 'brokerage',
}

@Entity('customer_kyc')
@Index(['customer_id', 'kyc_level', 'status'])
export class CustomerKyc {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'enum', enum: KycLevel, default: KycLevel.BASIC })
  kyc_level: KycLevel;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.PENDING })
  status: KycStatus;

  @Column({ type: 'date', nullable: true })
  dob: Date | null;

  @Column({ type: 'varchar', nullable: true })
  nationality: string | null;

  @Column({ type: 'enum', enum: MaritalStatus, nullable: true })
  marital_status: MaritalStatus | null;

  @Column({ type: 'enum', enum: EmploymentStatus, nullable: true })
  employment_status: EmploymentStatus | null;

  @Column({ type: 'float', nullable: true })
  annual_income: number | null;

  @Column({ type: 'varchar', nullable: true })
  employer_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  occupation: string | null;

  @Column({ type: 'int', nullable: true })
  investment_experience: number | null;

  @Column({ type: 'int', nullable: true })
  dependent_number: number | null;

  @Column({ type: 'varchar', nullable: true })
  source_of_funds: string | null;

  @Column({ type: 'enum', enum: RiskTolerance, nullable: true })
  risk_tolerance: RiskTolerance | null;

  @Column({ type: 'boolean', nullable: true })
  pep_flag: boolean | null;

  @Column({ type: 'varchar', nullable: true })
  tax_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  fatca_status: string | null; // could be enum later

  @Column({ type: 'timestamp', nullable: true })
  submitted_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
