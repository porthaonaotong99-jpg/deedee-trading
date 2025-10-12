import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockCategory } from '../../stock-categories/entities/stock-category.entity';

interface FinnhubProfile2 {
  country?: string;
  currency?: string;
  exchange?: string;
  finnhubIndustry?: string; // industry
  ipo?: string;
  logo?: string;
  marketCapitalization?: number;
  name?: string;
  phone?: string;
  shareOutstanding?: number;
  ticker?: string; // symbol
  weburl?: string;
}

@Injectable()
export class StockMetadataService {
  private readonly logger = new Logger(StockMetadataService.name);
  private readonly categoryMap: Record<string, string> = {
    // Simple normalization mapping; can be extended.
    // Keyed by lowercase industry or sector keywords
    'computer hardware': 'Technology',
    software: 'Technology',
    semiconductors: 'Technology',
    biotechnology: 'Healthcare',
    'health care': 'Healthcare',
    banks: 'Financials',
    'capital markets': 'Financials',
    insurance: 'Financials',
    'oil & gas': 'Energy',
    'oil & gas e&p': 'Energy',
    'oil & gas midstream': 'Energy',
    'oil & gas equipment & services': 'Energy',
    'renewable energy': 'Energy',
    'metals & mining': 'Materials',
    chemicals: 'Materials',
    gold: 'Materials',
    silver: 'Materials',
    lithium: 'Materials',
    'auto manufacturers': 'Consumer Discretionary',
    automobiles: 'Consumer Discretionary',
    'internet retail': 'Consumer Discretionary',
    'apparel retail': 'Consumer Discretionary',
    'beverages - non-alcoholic': 'Consumer Staples',
    confectioners: 'Consumer Staples',
    'packaged foods': 'Consumer Staples',
    'household & personal products': 'Consumer Staples',
    'aerospace & defense': 'Industrials',
    airlines: 'Industrials',
    railroads: 'Industrials',
    'utilities - regulated electric': 'Utilities',
    'utilities - regulated gas': 'Utilities',
    'utilities - renewable': 'Utilities',
    'real estate services': 'Real Estate',
    reit: 'Real Estate',
    'telecom services': 'Communication Services',
    entertainment: 'Communication Services',
    'interactive media & services': 'Communication Services',
  };

  // Cache profile lookups to avoid hitting API frequently (TTL simplistic)
  private profileCache = new Map<
    string,
    { data: FinnhubProfile2; fetchedAt: number }
  >();
  private readonly PROFILE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

  constructor(
    @InjectRepository(StockCategory)
    private readonly categoryRepository: Repository<StockCategory>,
  ) {}

  private getSystemUserId(): string | undefined {
    const v = process.env.SYSTEM_USER_ID?.trim();
    return v && v.length > 0 ? v : undefined;
  }

  private async fetchFinnhubProfile(
    symbol: string,
  ): Promise<FinnhubProfile2 | null> {
    const apiKey = process.env.FINNHUB_KEY;
    if (!apiKey) {
      this.logger.debug('FINNHUB_KEY missing; cannot classify symbol');
      return null;
    }
    const upper = symbol.toUpperCase();
    const cached = this.profileCache.get(upper);
    const now = Date.now();
    if (cached && now - cached.fetchedAt < this.PROFILE_TTL_MS) {
      return cached.data;
    }
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(upper)}&token=${apiKey}`;
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        this.logger.warn(
          `Finnhub profile2 request failed for ${upper} status=${res.status}`,
        );
        return null;
      }
      const data = (await res.json()) as FinnhubProfile2;
      if (!data || Object.keys(data).length === 0) {
        return null;
      }
      this.profileCache.set(upper, { data, fetchedAt: now });
      return data;
    } catch (e) {
      this.logger.warn(
        `Finnhub profile2 error for ${upper}: ${e instanceof Error ? e.message : e}`,
      );
      return null;
    }
  }

  /**
   * Get basic company metadata for a symbol (company name and country) using cached profile lookup.
   */
  async getCompanyBasics(symbol: string): Promise<{
    name?: string;
    country?: string;
  } | null> {
    const profile = await this.fetchFinnhubProfile(symbol);
    if (!profile) return null;
    return { name: profile.name, country: profile.country };
  }

  private normalizeCategory(industry?: string): string | null {
    if (!industry) return null;
    const key = industry.toLowerCase();
    for (const pattern in this.categoryMap) {
      if (key.includes(pattern)) return this.categoryMap[pattern];
    }
    // Fallback: Title Case original industry as category
    return industry
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  async classifySymbol(
    symbol: string,
  ): Promise<{ category: StockCategory | null; industry?: string } | null> {
    const enabled =
      (process.env.ENABLE_CATEGORY_AUTO_CLASSIFY || 'true') === 'true';
    if (!enabled) return null;

    const profile = await this.fetchFinnhubProfile(symbol);
    if (!profile) return null;

    const rawIndustry = profile.finnhubIndustry;
    const categoryName = this.normalizeCategory(rawIndustry);
    if (!categoryName) return null;

    let category = await this.categoryRepository.findOne({
      where: { name: categoryName },
    });
    if (!category) {
      category = this.categoryRepository.create({
        name: categoryName,
        created_by: this.getSystemUserId(),
        updated_by: this.getSystemUserId(),
      });
      try {
        await this.categoryRepository.save(category);
        this.logger.log(
          `Created new stock category '${categoryName}' (industry='${rawIndustry}')`,
        );
      } catch (e) {
        this.logger.debug(
          `Race creating category '${categoryName}': ${e instanceof Error ? e.message : e}`,
        );
        category = await this.categoryRepository.findOne({
          where: { name: categoryName },
        });
      }
    }

    return { category, industry: rawIndustry };
  }
}

/**
 * Classification Flow Overview
 * ---------------------------------
 * 1. When a new symbol is first seen, a placeholder stock row is created with default category 'Uncategorized'.
 * 2. A fire-and-forget call to assignCategoryIfPossible() triggers classifySymbol() here.
 * 3. classifySymbol():
 *    - Fetches Finnhub profile2 (cached for 6h) for sector/industry (finnhubIndustry field).
 *    - Normalizes raw industry string via categoryMap (substring match) to a broader category (e.g., 'semiconductors' -> 'Technology').
 *    - If no mapping match, uses Title Cased original industry as a category name.
 *    - Ensures (creates if needed) a StockCategory row for the resolved name.
 *    - Returns that category so caller can update stock row.
 * 4. Lazy Reclassification: getStockWithCategory() will attempt classification again if category still 'Uncategorized'.
 * 5. Env Toggle: Set ENABLE_CATEGORY_AUTO_CLASSIFY=false to disable all automatic classification.
 *
 * Extending Mapping:
 *  - Add new lower-case keys to categoryMap whose substring should map to a standardized category.
 *  - Keep category names consistent to avoid duplicates with slightly different capitalization.
 *  - Consider migrating to a more robust taxonomy (GICS, ICB) if needed; that would change normalizeCategory().
 */
