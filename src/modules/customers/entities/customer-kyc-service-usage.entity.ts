import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CustomerKyc } from './customer-kyc.entity';
import { CustomerService } from './customer-service.entity';

@Entity('customer_kyc_service_usage')
@Index(['kyc_id', 'service_id'], { unique: true })
export class CustomerKycServiceUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  kyc_id: string;

  @Column({ type: 'uuid' })
  service_id: string;

  @ManyToOne(() => CustomerKyc, { nullable: false })
  @JoinColumn({ name: 'kyc_id' })
  kyc: CustomerKyc;

  @ManyToOne(() => CustomerService, { nullable: false })
  @JoinColumn({ name: 'service_id' })
  service: CustomerService;

  @Column({ type: 'varchar', nullable: true, comment: 'Purpose or context' })
  purpose: string | null;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Optional snapshot of KYC fields at linking time',
  })
  kyc_snapshot: Record<string, unknown> | null;

  @CreateDateColumn()
  linked_at: Date;
}
