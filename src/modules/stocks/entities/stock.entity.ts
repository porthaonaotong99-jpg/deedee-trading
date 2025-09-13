import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { StockCategory } from '../../stock-categories/entities/stock-category.entity';
import { CustomerStock } from '../../customer-stocks/entities/customer-stock.entity';

@Entity('stocks')
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  symbol: string;

  @Column({
    type: 'float',
    nullable: true,
    comment: 'the latest price after market close',
  })
  last_price: number;

  @Column({ type: 'uuid', nullable: true })
  stock_categories_id: string;

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
  @ManyToOne(() => StockCategory, (category) => category.stocks, {
    nullable: true,
  })
  @JoinColumn({ name: 'stock_categories_id' })
  stockCategory?: StockCategory | null;

  @OneToMany(() => CustomerStock, (customerStock) => customerStock.stock)
  customerStocks: CustomerStock[];
}
