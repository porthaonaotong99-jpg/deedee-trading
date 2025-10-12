// Interest rate tier configuration
export interface InterestTier {
  name: string;
  minAmount: number;
  maxAmount: number | null;
  interestRate: number;
  description: string;
}

export class InterestTierService {
  // Interest rate tiers based on your photo
  private static readonly TIERS: InterestTier[] = [
    {
      name: 'bronze',
      minAmount: 10000,
      maxAmount: 49999,
      interestRate: 0.15, // 15%
      description: 'Bronze - 15% returns',
    },
    {
      name: 'silver',
      minAmount: 50000,
      maxAmount: 99999,
      interestRate: 0.18, // 18%
      description: 'Silver - 18% returns',
    },
    {
      name: 'gold',
      minAmount: 100000,
      maxAmount: null, // No upper limit
      interestRate: 0.2, // 20%
      description: 'Gold - 20% returns',
    },
  ];

  /**
   * Calculate interest tier and rate based on investment amount
   */
  static calculateTierForAmount(amount: number): {
    tier: string;
    interestRate: number;
    description: string;
  } | null {
    for (const tier of this.TIERS) {
      if (amount >= tier.minAmount) {
        if (tier.maxAmount === null || amount <= tier.maxAmount) {
          return {
            tier: tier.name,
            interestRate: tier.interestRate,
            description: tier.description,
          };
        }
      }
    }

    // If amount is below minimum tier
    return null;
  }

  /**
   * Get all available tiers for display
   */
  static getAllTiers(): InterestTier[] {
    return this.TIERS;
  }

  /**
   * Format tier information for display
   */
  static formatTierInfo(): string[] {
    return this.TIERS.map((tier) => {
      const maxDisplay = tier.maxAmount
        ? `$${tier.maxAmount.toLocaleString()}`
        : '+';
      return `${tier.name.toUpperCase()}: $${tier.minAmount.toLocaleString()} - ${maxDisplay} (${(tier.interestRate * 100).toFixed(0)}% returns)`;
    });
  }

  /**
   * Validate if amount qualifies for any tier
   */
  static isAmountQualified(amount: number): boolean {
    return this.calculateTierForAmount(amount) !== null;
  }

  /**
   * Get minimum investment amount
   */
  static getMinimumInvestment(): number {
    return Math.min(...this.TIERS.map((tier) => tier.minAmount));
  }
}
