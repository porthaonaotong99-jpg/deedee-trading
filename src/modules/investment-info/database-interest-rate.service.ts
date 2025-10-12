import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InterestRateConfiguration,
  RiskTolerance,
  InterestTierName,
} from './entities/interest-rate-configuration.entity';

export interface InterestRateCalculationResult {
  config_id: string;
  tier_name: string;
  risk_tolerance: string;
  base_rate: number;
  risk_adjustment: number;
  final_rate: number;
  description: string;
  min_amount: number;
  max_amount: number | null;
}

export interface CreateInterestRateConfigDto {
  tier_name: InterestTierName;
  min_amount: number;
  max_amount?: number | null;
  risk_tolerance: RiskTolerance;
  base_interest_rate: number;
  risk_adjustment?: number;
  description?: string;
  conditions?: string;
  created_by?: string;
}

export interface UpdateInterestRateConfigDto {
  base_interest_rate?: number;
  risk_adjustment?: number;
  description?: string;
  conditions?: string;
  is_active?: boolean;
  updated_by?: string;
}

@Injectable()
export class DatabaseInterestRateService {
  constructor(
    @InjectRepository(InterestRateConfiguration)
    private readonly configRepo: Repository<InterestRateConfiguration>,
  ) {}

  /**
   * Calculate interest rate based on amount and risk tolerance from database
   */
  async calculateInterestRate(
    amount: number,
    riskTolerance: RiskTolerance,
  ): Promise<InterestRateCalculationResult | null> {
    const configs = await this.configRepo.find({
      where: {
        risk_tolerance: riskTolerance,
        is_active: true,
      },
      order: {
        sort_order: 'ASC',
        min_amount: 'ASC',
      },
    });

    for (const config of configs) {
      const minAmount = Number(config.min_amount);
      const maxAmount = config.max_amount ? Number(config.max_amount) : null;

      if (amount >= minAmount && (maxAmount === null || amount <= maxAmount)) {
        const baseRate = Number(config.base_interest_rate);
        const riskAdj = Number(config.risk_adjustment);
        const finalRate = baseRate + riskAdj;

        return {
          config_id: config.id,
          tier_name: config.tier_name,
          risk_tolerance: config.risk_tolerance,
          base_rate: baseRate,
          risk_adjustment: riskAdj,
          final_rate: finalRate,
          description: config.formatted_description,
          min_amount: minAmount,
          max_amount: maxAmount,
        };
      }
    }

    return null; // No matching configuration found
  }

  /**
   * Get all active interest rate configurations
   */
  async getAllActiveConfigurations(): Promise<InterestRateConfiguration[]> {
    return this.configRepo.find({
      where: { is_active: true },
      order: {
        tier_name: 'ASC',
        risk_tolerance: 'ASC',
        sort_order: 'ASC',
      },
    });
  }

  /**
   * Get configurations by risk tolerance
   */
  async getConfigurationsByRiskTolerance(
    riskTolerance: RiskTolerance,
  ): Promise<InterestRateConfiguration[]> {
    return this.configRepo.find({
      where: {
        risk_tolerance: riskTolerance,
        is_active: true,
      },
      order: { sort_order: 'ASC', min_amount: 'ASC' },
    });
  }

  /**
   * Create new interest rate configuration
   */
  async createConfiguration(
    dto: CreateInterestRateConfigDto,
  ): Promise<InterestRateConfiguration> {
    const finalRate = dto.base_interest_rate + (dto.risk_adjustment || 0);

    const config = this.configRepo.create({
      tier_name: dto.tier_name,
      min_amount: dto.min_amount.toString(),
      max_amount: dto.max_amount?.toString() || null,
      risk_tolerance: dto.risk_tolerance,
      base_interest_rate: dto.base_interest_rate.toString(),
      risk_adjustment: (dto.risk_adjustment || 0).toString(),
      final_interest_rate: finalRate.toString(),
      description: dto.description || null,
      conditions: dto.conditions || null,
      created_by: dto.created_by || null,
    });

    return this.configRepo.save(config);
  }

  /**
   * Update interest rate configuration
   */
  async updateConfiguration(
    id: string,
    dto: UpdateInterestRateConfigDto,
  ): Promise<InterestRateConfiguration> {
    const config = await this.configRepo.findOne({ where: { id } });
    if (!config) {
      throw new Error('Interest rate configuration not found');
    }

    if (dto.base_interest_rate !== undefined) {
      config.base_interest_rate = dto.base_interest_rate.toString();
    }
    if (dto.risk_adjustment !== undefined) {
      config.risk_adjustment = dto.risk_adjustment.toString();
    }
    if (dto.description !== undefined) {
      config.description = dto.description;
    }
    if (dto.conditions !== undefined) {
      config.conditions = dto.conditions;
    }
    if (dto.is_active !== undefined) {
      config.is_active = dto.is_active;
    }
    if (dto.updated_by !== undefined) {
      config.updated_by = dto.updated_by;
    }

    // Recalculate final rate
    const baseRate = Number(config.base_interest_rate);
    const riskAdj = Number(config.risk_adjustment);
    config.final_interest_rate = (baseRate + riskAdj).toString();

    return this.configRepo.save(config);
  }

  /**
   * Delete (deactivate) configuration
   */
  async deactivateConfiguration(id: string): Promise<void> {
    await this.configRepo.update(id, { is_active: false });
  }

  /**
   * Get configuration by ID
   */
  async getConfigurationById(
    id: string,
  ): Promise<InterestRateConfiguration | null> {
    return this.configRepo.findOne({ where: { id } });
  }

  /**
   * Seed default interest rate configurations
   */
  async seedDefaultConfigurations(): Promise<void> {
    const existingConfigs = await this.configRepo.count();
    if (existingConfigs > 0) {
      return; // Already seeded
    }

    const defaultConfigs: CreateInterestRateConfigDto[] = [
      // Bronze Tier
      {
        tier_name: InterestTierName.BRONZE,
        min_amount: 10000,
        max_amount: 49999,
        risk_tolerance: RiskTolerance.LOW,
        base_interest_rate: 0.12, // 12%
        risk_adjustment: 0.01, // +1%
        description: 'Bronze tier for conservative investors',
        created_by: 'system',
      },
      {
        tier_name: InterestTierName.BRONZE,
        min_amount: 10000,
        max_amount: 49999,
        risk_tolerance: RiskTolerance.MEDIUM,
        base_interest_rate: 0.12, // 12%
        risk_adjustment: 0.03, // +3%
        description: 'Bronze tier for moderate risk investors',
        created_by: 'system',
      },
      {
        tier_name: InterestTierName.BRONZE,
        min_amount: 10000,
        max_amount: 49999,
        risk_tolerance: RiskTolerance.HIGH,
        base_interest_rate: 0.12, // 12%
        risk_adjustment: 0.05, // +5%
        description: 'Bronze tier for high risk investors',
        created_by: 'system',
      },
      // Silver Tier
      {
        tier_name: InterestTierName.SILVER,
        min_amount: 50000,
        max_amount: 99999,
        risk_tolerance: RiskTolerance.LOW,
        base_interest_rate: 0.15, // 15%
        risk_adjustment: 0.02, // +2%
        description: 'Silver tier for conservative investors',
        created_by: 'system',
      },
      {
        tier_name: InterestTierName.SILVER,
        min_amount: 50000,
        max_amount: 99999,
        risk_tolerance: RiskTolerance.MEDIUM,
        base_interest_rate: 0.15, // 15%
        risk_adjustment: 0.04, // +4%
        description: 'Silver tier for moderate risk investors',
        created_by: 'system',
      },
      {
        tier_name: InterestTierName.SILVER,
        min_amount: 50000,
        max_amount: 99999,
        risk_tolerance: RiskTolerance.HIGH,
        base_interest_rate: 0.15, // 15%
        risk_adjustment: 0.06, // +6%
        description: 'Silver tier for high risk investors',
        created_by: 'system',
      },
      // Gold Tier
      {
        tier_name: InterestTierName.GOLD,
        min_amount: 100000,
        max_amount: null,
        risk_tolerance: RiskTolerance.LOW,
        base_interest_rate: 0.18, // 18%
        risk_adjustment: 0.02, // +2%
        description: 'Gold tier for conservative investors',
        created_by: 'system',
      },
      {
        tier_name: InterestTierName.GOLD,
        min_amount: 100000,
        max_amount: null,
        risk_tolerance: RiskTolerance.MEDIUM,
        base_interest_rate: 0.18, // 18%
        risk_adjustment: 0.04, // +4%
        description: 'Gold tier for moderate risk investors',
        created_by: 'system',
      },
      {
        tier_name: InterestTierName.GOLD,
        min_amount: 100000,
        max_amount: null,
        risk_tolerance: RiskTolerance.HIGH,
        base_interest_rate: 0.18, // 18%
        risk_adjustment: 0.06, // +6%
        description: 'Gold tier for high risk investors',
        created_by: 'system',
      },
    ];

    for (const config of defaultConfigs) {
      await this.createConfiguration(config);
    }
  }
}
