import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CustomerServiceType } from './customer-service.entity';

@Entity('subscription_packages')
@Index('idx_subscription_packages_active', ['active'])
@Index('idx_subscription_packages_service_type', ['service_type'])
export class SubscriptionPackage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: CustomerServiceType })
  service_type!: CustomerServiceType;

  @Column({ type: 'int' })
  duration_months!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price!: string; // keep as string from TypeORM numeric; convert to number when needed

  @Column({ type: 'varchar', length: 8, default: 'USD' })
  currency!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
