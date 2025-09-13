import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Stock } from '../../stocks/entities/stock.entity';
import { Customer } from '../../customers/entities/customer.entity';

@Entity('customer_stocks')
export class CustomerStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'float', nullable: true })
  buying_price: number;

  @Column({ type: 'float', nullable: true, comment: 'amount of stock holding' })
  share: number;

  @Column({ type: 'float', nullable: true })
  total_buying_price: number;

  @Column({ type: 'varchar', nullable: true, comment: 'P&L change percent' })
  change: string;

  @Column({
    type: 'float',
    nullable: true,
    comment: 'when buy on different price',
  })
  avg_price: number;

  @Column({ type: 'float', nullable: true, comment: 'avg_price x position' })
  cost_basis: number;

  @Column({
    type: 'float',
    nullable: true,
    comment: 'current price x position',
  })
  market_value: number;

  @Column({ type: 'float', nullable: true, comment: 'current date P&L' })
  daily_pl: number;

  @Column({ type: 'uuid', nullable: true })
  stock_id: string;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string;

  @Column({ type: 'uuid', nullable: true })
  deleted_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Stock, 'customerStocks')
  @JoinColumn({ name: 'stock_id' })
  stock: Stock;

  @ManyToOne(() => Customer, 'customerStocks')
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
