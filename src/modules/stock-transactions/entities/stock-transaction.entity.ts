import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StockTransactionType } from '../../../common/enums';
import { Customer } from '../../customers/entities/customer.entity';

@Entity('stock_transactions')
export class StockTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: StockTransactionType,
    nullable: true,
    comment: 'buy or sell',
  })
  type: StockTransactionType;

  @Column({ type: 'float', nullable: true })
  quantity: number;

  @Column({ type: 'float', nullable: true })
  buy_price: number;

  @Column({ type: 'float', nullable: true, comment: 'quantity x buy price' })
  amount: number;

  @Column({ type: 'uuid', nullable: true })
  stock_id: string;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => Customer, 'stockTransactions')
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
