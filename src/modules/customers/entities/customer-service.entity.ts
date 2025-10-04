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

export enum SubscriptionDuration {
  THREE_MONTHS = 3,
  SIX_MONTHS = 6,
  TWELVE_MONTHS = 12,
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

  @Column({ type: 'boolean', default: false })
  requires_payment: boolean;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Subscription duration in months (3, 6, or 12)',
  })
  subscription_duration: SubscriptionDuration | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When the subscription expires',
  })
  subscription_expires_at: Date | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Subscription fee amount',
  })
  subscription_fee: number | null;

  @CreateDateColumn()
  applied_at: Date;
}
