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
import { StockPick } from './stock-pick.entity';

export enum CustomerPickStatus {
  SELECTED = 'selected',
  PAYMENT_SUBMITTED = 'payment_submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EMAIL_SENT = 'email_sent',
}

@Entity('customer_stock_picks')
// @Index(['customer_id', 'stock_pick_id'], { unique: true })
export class CustomerStockPick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'uuid' })
  stock_pick_id: string;

  @ManyToOne(() => StockPick, 'customer_picks', {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'stock_pick_id' })
  stock_pick: StockPick;

  @Column({
    type: 'enum',
    enum: CustomerPickStatus,
    default: CustomerPickStatus.SELECTED,
  })
  status: CustomerPickStatus;

  @Column({ type: 'text', nullable: true })
  customer_notes: string | null;

  @Column({ type: 'text', nullable: true })
  admin_response: string | null;

  @Column({ type: 'varchar', nullable: true })
  payment_slip_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  payment_slip_filename: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  payment_amount: number | null;

  @Column({ type: 'varchar', nullable: true })
  payment_reference: string | null;

  @Column({ type: 'timestamp', nullable: true })
  payment_submitted_at: Date | null;

  // Snapshot of the stock price when the customer selected/submitted this pick
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  selected_price: number | null;

  @Column({ type: 'uuid', nullable: true })
  approved_by_admin_id: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  email_sent_at: Date | null;

  @CreateDateColumn()
  selected_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
