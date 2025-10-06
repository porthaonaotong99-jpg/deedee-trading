import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { CustomerService } from './customer-service.entity';

export enum ServiceFundTransactionType {
  TOPUP = 'topup',
  TRANSFER = 'transfer',
}

@Entity('service_fund_transactions')
export class ServiceFundTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'uuid', nullable: true })
  from_service_id: string | null;

  @ManyToOne(() => CustomerService, { nullable: true })
  @JoinColumn({ name: 'from_service_id' })
  from_service: CustomerService | null;

  @Column({ type: 'uuid', nullable: true })
  to_service_id: string | null;

  @ManyToOne(() => CustomerService, { nullable: true })
  @JoinColumn({ name: 'to_service_id' })
  to_service: CustomerService | null;

  @Column({ type: 'enum', enum: ServiceFundTransactionType })
  tx_type: ServiceFundTransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @CreateDateColumn()
  created_at: Date;
}
