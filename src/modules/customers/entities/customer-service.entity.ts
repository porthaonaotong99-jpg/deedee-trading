import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

export enum CustomerServiceType {
  PREMIUM_MEMBERSHIP = 'premium_membership',
  PREMIUM_STOCK_PICKS = 'premium_stock_picks',
  INTERNATIONAL_STOCK_ACCOUNT = 'international_stock_account',
  GUARANTEED_RETURNS = 'guaranteed_returns',
}

@Entity('customer_services')
export class CustomerService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'enum', enum: CustomerServiceType })
  service_type: CustomerServiceType;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  applied_at: Date;
}
