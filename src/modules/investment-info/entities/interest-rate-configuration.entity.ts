import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RiskTolerance {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum InterestTierName {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

@Entity('interest_rate_configurations')
@Index(['tier_name', 'risk_tolerance', 'is_active'], { unique: true })
export class InterestRateConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: InterestTierName })
  tier_name: InterestTierName;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  min_amount: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  max_amount: string | null;

  @Column({ type: 'enum', enum: RiskTolerance })
  risk_tolerance: RiskTolerance;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  base_interest_rate: string; // Base rate for this tier

  @Column({ type: 'decimal', precision: 5, scale: 4, default: '0.0000' })
  risk_adjustment: string; // Additional rate based on risk tolerance

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  final_interest_rate: string; // base_rate + risk_adjustment

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  conditions: string | null; // Special conditions or requirements

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number; // For ordering tiers

  @Column({ type: 'varchar', length: 100, nullable: true })
  created_by: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  updated_by: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Calculated field for display
  get effective_rate(): number {
    return Number(this.base_interest_rate) + Number(this.risk_adjustment);
  }

  get formatted_description(): string {
    const rate = (this.effective_rate * 100).toFixed(1);
    const riskText = this.risk_tolerance.toUpperCase();
    const tierText = this.tier_name.toUpperCase();
    const minAmount = Number(this.min_amount).toLocaleString();
    const maxAmount = this.max_amount
      ? Number(this.max_amount).toLocaleString()
      : 'No Limit';

    return `${tierText} Tier (${riskText} Risk): $${minAmount} - $${maxAmount} → ${rate}% returns`;
  }
}
