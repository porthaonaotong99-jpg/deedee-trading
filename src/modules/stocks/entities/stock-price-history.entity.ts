import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Stock } from './stock.entity';

@Entity('stock_price_history')
@Index(['symbol', 'recorded_at'])
export class StockPriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  stock_id: string | null;

  @ManyToOne(() => Stock, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'stock_id' })
  stock?: Stock | null;

  @Column({ type: 'varchar', length: 10 })
  @Index()
  symbol: string;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  open: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  high: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  low: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  previous_close: number | null;

  @Column({ type: 'bigint', nullable: true })
  volume: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  bid: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  ask: number | null;

  @Column({ type: 'int', nullable: true })
  bid_size: number | null;

  @Column({ type: 'int', nullable: true })
  ask_size: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  change: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  change_percent: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  source: string | null; // EXTERNAL, SIMULATION, IBKR_SIM

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider: string | null; // yahoo, finnhub, etc.

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  recorded_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
