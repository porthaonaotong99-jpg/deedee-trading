import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CustomerServiceType } from '../../customers/entities/customer-service.entity';
import { CustomerStockPick } from './customer-stock-pick.entity';

export enum StockPickStatus {
  GOOD = 'good',
  BAD = 'bad',
  NEUTRAL = 'neutral',
  PENDING = 'pending',
}

export enum StockPickAvailability {
  AVAILABLE = 'available',
  TAKEN = 'taken',
  EXPIRED = 'expired',
}

export enum StockPickRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum StockPickTierLabel {
  BUDGET = 'budget',
  PREMIUM = 'premium',
  ELITE = 'elite',
}

@Entity('stock_picks')
export class StockPick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  stock_symbol: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: StockPickStatus,
    default: StockPickStatus.PENDING,
  })
  status: StockPickStatus;

  @Column({
    type: 'enum',
    enum: StockPickAvailability,
    default: StockPickAvailability.AVAILABLE,
  })
  availability: StockPickAvailability;

  @Column({ type: 'enum', enum: CustomerServiceType })
  service_type: CustomerServiceType;

  @Column({ type: 'uuid' })
  created_by_admin_id: string;

  @Column({ type: 'text', nullable: true })
  admin_notes: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  target_price: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  current_price: number | null;

  // New fields to support customer card UI and purchase price
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: 'Sale price customers pay to view the full analysis',
  })
  sale_price: number;

  @Column({ type: 'enum', enum: StockPickRiskLevel, nullable: true })
  risk_level: StockPickRiskLevel | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Expected minimum return percentage (0-100)',
  })
  expected_return_min_percent: number | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Expected maximum return percentage (0-100)',
  })
  expected_return_max_percent: number | null;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Minimum expected holding period in months',
  })
  time_horizon_min_months: number | null;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Maximum expected holding period in months',
  })
  time_horizon_max_months: number | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Sector/industry name',
  })
  sector: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Analyst display name',
  })
  analyst_name: string | null;

  @Column({
    type: 'enum',
    enum: StockPickTierLabel,
    nullable: true,
    comment: 'Badge label (budget/premium/elite)',
  })
  tier_label: StockPickTierLabel | null;

  @Column({
    type: 'text',
    array: true,
    default: () => 'array[]::text[]',
    nullable: true,
    comment: 'Key investment bullet points',
  })
  key_points: string[] | null;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether the analysis can be delivered via email',
  })
  email_delivery: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany(() => CustomerStockPick, (customerPick) => customerPick.stock_pick)
  customer_picks: CustomerStockPick[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
