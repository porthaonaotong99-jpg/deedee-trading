import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from '../entities/stock.entity';
import { StockCategory } from '../../stock-categories/entities/stock-category.entity';
import { StockPriceHistory } from '../entities/stock-price-history.entity';
import { Cron } from '@nestjs/schedule';
import { StockPricesGateway } from '../gateways/stock-prices.gateway';
import { ExternalPriceFetcherService } from './external-price-fetcher.service';
import { StockMetadataService } from './stock-metadata.service';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  bidPrice?: number;
  askPrice?: number;
  bidSize?: number;
  askSize?: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  source: 'EXTERNAL' | 'SIMULATION' | 'IBKR_SIM' | 'UNKNOWN';
  provider?: string; // external provider name
}

@Injectable()
export class RealTimePriceService {
  private readonly logger = new Logger(RealTimePriceService.name);
  private readonly priceCache = new Map<string, PriceData>();
  private readonly subscriptions = new Set<string>();

  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(StockPriceHistory)
    private readonly historyRepository: Repository<StockPriceHistory>,
    @InjectRepository(StockCategory)
    private readonly categoryRepository: Repository<StockCategory>,
    @Inject(forwardRef(() => StockPricesGateway))
    private readonly stockPricesGateway: StockPricesGateway,
    private readonly externalPriceFetcher: ExternalPriceFetcherService,
    private readonly stockMetadata: StockMetadataService,
  ) {}

  /**
   * Resolve a nullable system user id for audit fields. If ENV SYSTEM_USER_ID not set, returns undefined so DB allows null.
   */
  private getSystemUserId(): string | undefined {
    const v = process.env.SYSTEM_USER_ID?.trim();
    return v && v.length > 0 ? v : undefined;
  }

  /**
   * Subscribe to real-time price updates for a symbol
   */
  async subscribe(symbol: string): Promise<void> {
    const upper = symbol.toUpperCase();
    await this.ensureStockExists(upper);
    if (this.subscriptions.has(upper)) return;
    this.subscriptions.add(upper);
    this.logger.log(`Subscribed to real-time data for ${upper}`);
    // Attempt immediate real quote fetch
    await this.fetchAndUpdate(upper, true);
  }

  /**
   * Public helper so controllers can ensure a symbol & category exist without subscribing.
   */
  async ensureSymbol(symbol: string): Promise<void> {
    await this.ensureStockExists(symbol.toUpperCase());
  }

  /**
   * Unsubscribe from real-time price updates for a symbol
   */
  unsubscribe(symbol: string): void {
    const upper = symbol.toUpperCase();
    this.subscriptions.delete(upper);
    this.logger.log(`Unsubscribed from real-time data for ${upper}`);
  }

  /**
   * Get current price from cache
   */
  getCurrentPrice(symbol: string): PriceData | null {
    return this.priceCache.get(symbol.toUpperCase()) || null;
  }

  /**
   * Update price data in cache and database
   */
  async updatePrice(symbol: string, priceData: PriceData): Promise<void> {
    const upperSymbol = symbol.toUpperCase();
    await this.ensureStockExists(upperSymbol);

    // Update cache
    this.priceCache.set(upperSymbol, priceData);

    // Upsert latest snapshot in stocks table
    await this.upsertStockInDatabase(upperSymbol, priceData);

    // Persist history (fire & forget, do not block broadcast excessively)
    void this.persistHistoryRow(upperSymbol, priceData).catch((err) => {
      this.logger.error(`Failed to write history for ${upperSymbol}`, err);
    });

    // Broadcast to WebSocket clients
    void this.stockPricesGateway.broadcastPriceUpdate({
      symbol: upperSymbol,
      price: priceData.price,
      change: priceData.change,
      changePercent: priceData.changePercent,
      volume: priceData.volume,
      timestamp: new Date(),
      bidPrice: priceData.bidPrice,
      askPrice: priceData.askPrice,
      bidSize: priceData.bidSize,
      askSize: priceData.askSize,
    });

    this.logger.debug(
      `Updated price for ${upperSymbol}: $${priceData.price} src=${priceData.source}${priceData.provider ? ':' + priceData.provider : ''}`,
    );
  }

  /**
   * Update multiple price data points
   */
  async updatePrices(
    priceUpdates: Array<{ symbol: string; data: PriceData }>,
  ): Promise<void> {
    const updatePromises = priceUpdates.map(({ symbol, data }) =>
      this.updatePrice(symbol, data),
    );

    await Promise.all(updatePromises);
  }

  /**
   * Update stock data in database
   */
  private async upsertStockInDatabase(
    symbol: string,
    priceData: PriceData,
  ): Promise<void> {
    try {
      const updateResult = await this.stockRepository.update(
        { symbol },
        {
          last_price: priceData.price,
          change: priceData.change,
          change_percent: priceData.changePercent,
          volume: priceData.volume,
          bid_price: priceData.bidPrice,
          ask_price: priceData.askPrice,
          bid_size: priceData.bidSize,
          ask_size: priceData.askSize,
          high_price: priceData.high,
          low_price: priceData.low,
          open_price: priceData.open,
          previous_close: priceData.previousClose,
          data_source: priceData.provider || priceData.source,
          data_type: priceData.source === 'EXTERNAL' ? 'REAL_TIME' : 'SNAPSHOT',
          data_delay_minutes: priceData.source === 'EXTERNAL' ? 0 : 15,
          last_price_update: new Date(),
          last_trade_time: new Date(),
          updated_by: this.getSystemUserId(),
        },
      );

      if (!updateResult.affected || updateResult.affected === 0) {
        // Create new row with full price data (race condition fallback)
        await this.stockRepository.save({
          name: symbol,
          symbol,
          currency: 'USD',
          // default exchange / type values
          exchange: 'SMART',
          security_type: 'STK',
          last_price: priceData.price,
          change: priceData.change,
          change_percent: priceData.changePercent,
          volume: priceData.volume,
          bid_price: priceData.bidPrice,
          ask_price: priceData.askPrice,
          bid_size: priceData.bidSize,
          ask_size: priceData.askSize,
          high_price: priceData.high,
          low_price: priceData.low,
          open_price: priceData.open,
          previous_close: priceData.previousClose,
          data_source: priceData.provider || priceData.source,
          data_type: priceData.source === 'EXTERNAL' ? 'REAL_TIME' : 'SNAPSHOT',
          data_delay_minutes: priceData.source === 'EXTERNAL' ? 0 : 15,
          last_price_update: new Date(),
          last_trade_time: new Date(),
          is_tradable: true,
          is_active: true,
          created_by: this.getSystemUserId(),
          updated_by: this.getSystemUserId(),
        });
        this.logger.log(`Inserted new stock snapshot row for ${symbol}`);
      } else {
        this.logger.debug(`Updated existing stock snapshot row for ${symbol}`);
      }
    } catch (error) {
      this.logger.error(`Failed to upsert stock ${symbol}:`, error);
    }
  }

  private async persistHistoryRow(
    symbol: string,
    priceData: PriceData,
  ): Promise<void> {
    try {
      const stock = await this.stockRepository.findOne({ where: { symbol } });
      await this.historyRepository.insert({
        stock_id: stock?.id || null,
        symbol,
        price: priceData.price,
        open: priceData.open,
        high: priceData.high,
        low: priceData.low,
        previous_close: priceData.previousClose,
        volume: priceData.volume,
        bid: priceData.bidPrice ?? null,
        ask: priceData.askPrice ?? null,
        bid_size: priceData.bidSize ?? null,
        ask_size: priceData.askSize ?? null,
        change: priceData.change,
        change_percent: priceData.changePercent,
        source: priceData.source,
        provider: priceData.provider ?? null,
        recorded_at: new Date(),
      });
    } catch (e) {
      this.logger.warn(
        `History insert failed for ${symbol}: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  /**
   * Get all subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Check if symbol is subscribed
   */
  isSubscribed(symbol: string): boolean {
    return this.subscriptions.has(symbol.toUpperCase());
  }

  /**
   * Periodic cache cleanup - remove old data
   */
  @Cron('0 * * * *') // Run every hour
  cleanupCache(): void {
    // For now, we'll just log cache size
    // In production, you'd implement actual cache cleanup based on timestamps
    this.logger.debug(`Cache cleanup - current size: ${this.priceCache.size}`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    subscriptions: number;
    symbols: string[];
  } {
    return {
      size: this.priceCache.size,
      subscriptions: this.subscriptions.size,
      symbols: Array.from(this.priceCache.keys()),
    };
  }

  /**
   * Clear all cache data
   */
  clearCache(): void {
    this.priceCache.clear();
    this.logger.log('Price cache cleared');
  }

  /**
   * Fetch real market data from external providers and update cache/database.
   * Falls back to simulation if no provider returns a quote.
   */
  async fetchAndUpdate(
    symbol: string,
    allowSimFallback = false,
  ): Promise<void> {
    await this.ensureStockExists(symbol.toUpperCase());
    const quote = await this.externalPriceFetcher.fetchQuote(symbol);
    if (!quote) {
      const simEnabled =
        (process.env.ENABLE_PRICE_SIMULATION || 'true') === 'true';
      if (allowSimFallback && simEnabled) {
        this.logger.warn(
          `No external quote for ${symbol}, using simulated data fallback`,
        );
        await this.simulateMarketData(symbol);
      }
      return;
    }

    const previous = this.getCurrentPrice(symbol);
    const basePreviousClose =
      quote.previousClose ?? previous?.previousClose ?? quote.price;
    const change = quote.price - basePreviousClose;
    const changePercent = basePreviousClose
      ? (change / basePreviousClose) * 100
      : 0;

    const priceData: PriceData = {
      symbol: symbol.toUpperCase(),
      price: quote.price,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: quote.volume ?? previous?.volume ?? 0,
      bidPrice: quote.bid ?? previous?.bidPrice,
      askPrice: quote.ask ?? previous?.askPrice,
      bidSize: quote.bidSize ?? previous?.bidSize,
      askSize: quote.askSize ?? previous?.askSize,
      high: Math.max(quote.high ?? quote.price, previous?.high ?? quote.price),
      low: Math.min(quote.low ?? quote.price, previous?.low ?? quote.price),
      open: quote.open ?? previous?.open ?? quote.price,
      previousClose: basePreviousClose,
      source: 'EXTERNAL',
      provider: quote.provider,
    };

    await this.updatePrice(symbol, priceData);
  }

  /**
   * Scheduled refresh of all subscribed symbols every minute (can adjust).
   */
  @Cron('*/60 * * * * *') // every 60 seconds
  async refreshSubscribedQuotes(): Promise<void> {
    if (!this.subscriptions.size) return;
    this.logger.debug(
      `Refreshing quotes for ${this.subscriptions.size} subscribed symbols`,
    );
    for (const symbol of this.subscriptions) {
      await this.fetchAndUpdate(symbol, true);
    }
  }

  /**
   * Simulate market data update (for testing)
   */
  async simulateMarketData(symbol: string): Promise<void> {
    const currentPrice = this.getCurrentPrice(symbol);
    const basePrice = currentPrice?.price || Math.random() * 100 + 50;

    // Generate random price movement
    const priceChange = (Math.random() - 0.5) * 2; // -1 to +1
    const newPrice = Math.max(0.01, basePrice + priceChange);
    const change = newPrice - (currentPrice?.previousClose || basePrice);
    const changePercent =
      (change / (currentPrice?.previousClose || basePrice)) * 100;

    const simulatedData: PriceData = {
      symbol: symbol.toUpperCase(),
      price: Math.round(newPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: Math.floor(Math.random() * 1000000) + 10000,
      bidPrice: newPrice - 0.01,
      askPrice: newPrice + 0.01,
      bidSize: Math.floor(Math.random() * 1000) + 100,
      askSize: Math.floor(Math.random() * 1000) + 100,
      high: Math.max(newPrice, currentPrice?.high || newPrice),
      low: Math.min(newPrice, currentPrice?.low || newPrice),
      open: currentPrice?.open || newPrice,
      previousClose: currentPrice?.previousClose || basePrice,
      source: 'SIMULATION',
    };

    await this.updatePrice(symbol, simulatedData);
  }

  /**
   * Ensure a stock row exists; if not, create minimal placeholder.
   */
  private async ensureStockExists(symbol: string): Promise<void> {
    const existing = await this.stockRepository.findOne({ where: { symbol } });
    if (existing) return;
    try {
      // Validate symbol through external providers before persisting
      const valid =
        await this.externalPriceFetcher.validateSymbolExists(symbol);
      if (!valid) {
        this.logger.warn(
          `Symbol validation failed; not inserting placeholder for '${symbol}'.`,
        );
        return;
      }
      // Ensure a default catch-all category exists (e.g., "Uncategorized")
      const category = await this.ensureDefaultCategory();
      this.logger.debug(
        `Creating placeholder stock for ${symbol} (category=${category?.id || 'none'})`,
      );
      const placeholder = this.stockRepository.create({
        name: symbol,
        symbol,
        currency: 'USD',
        exchange: 'SMART',
        security_type: 'STK',
        is_tradable: true,
        is_active: true,
        data_source: 'ON_DEMAND',
        data_type: 'DELAYED',
        data_delay_minutes: 15,
        created_by: this.getSystemUserId(),
        updated_by: this.getSystemUserId(),
        stock_categories_id: category?.id,
      });
      await this.stockRepository.save(placeholder);
      this.logger.log(`Created placeholder stock row for ${symbol}`);
      // Non-blocking classification attempt
      void this.assignCategoryIfPossible(symbol).catch((e) =>
        this.logger.debug(
          `assignCategoryIfPossible failed for ${symbol}: ${e instanceof Error ? e.message : e}`,
        ),
      );
    } catch (e) {
      // Ignore duplicate race condition
      this.logger.debug(
        `ensureStockExists race for ${symbol}: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  /**
   * Ensure a default stock category exists for auto-created symbols.
   * Returns the category entity (cached after first creation attempt).
   */
  private defaultCategoryCache: StockCategory | null = null;
  private async ensureDefaultCategory(): Promise<StockCategory | null> {
    if (this.defaultCategoryCache) return this.defaultCategoryCache;
    try {
      let cat = await this.categoryRepository.findOne({
        where: { name: 'Uncategorized' },
      });
      if (!cat) {
        cat = this.categoryRepository.create({
          name: 'Uncategorized',
          created_by: this.getSystemUserId(),
          updated_by: this.getSystemUserId(),
        });
        await this.categoryRepository.save(cat);
        this.logger.log('Created default stock category "Uncategorized"');
      } else {
        this.logger.debug(`Default category already exists (id=${cat.id})`);
      }
      this.defaultCategoryCache = cat;
      return cat;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('invalid input syntax for type uuid')) {
        this.logger.error(
          'Default category creation failed due to invalid SYSTEM_USER_ID. Set SYSTEM_USER_ID env to a valid UUID or leave it unset for null.',
        );
      }
      this.logger.warn(`Failed to ensure default category: ${msg}`);
      return null;
    }
  }

  /**
   * Fetch a stock with its category relation for a given symbol.
   * Returns null if not found. Ensures no creation side-effects; use ensureSymbol before if required.
   */
  async getStockWithCategory(
    symbol: string,
  ): Promise<
    | (Stock & { categoryName?: string | null; categoryId?: string | null })
    | null
  > {
    const upper = symbol.toUpperCase();
    const stock = await this.stockRepository.findOne({
      where: { symbol: upper },
      relations: { stockCategory: true },
    });
    if (!stock) return null;
    // Lazy reclassification if still Uncategorized and auto-classify enabled
    if (
      (process.env.ENABLE_CATEGORY_AUTO_CLASSIFY || 'true') === 'true' &&
      (!stock.stockCategory || stock.stockCategory.name === 'Uncategorized')
    ) {
      void this.assignCategoryIfPossible(upper).catch((e) =>
        this.logger.debug(
          `lazy assignCategoryIfPossible failed for ${upper}: ${e instanceof Error ? e.message : e}`,
        ),
      );
    }
    return Object.assign(stock, {
      categoryName: stock.stockCategory?.name || null,
      categoryId: stock.stockCategory?.id || stock.stock_categories_id || null,
    });
  }

  /**
   * Attempt to classify a symbol and update its category if currently Uncategorized or null.
   */
  private async assignCategoryIfPossible(symbol: string): Promise<void> {
    const enabled =
      (process.env.ENABLE_CATEGORY_AUTO_CLASSIFY || 'true') === 'true';
    if (!enabled) return;
    const upper = symbol.toUpperCase();
    const stock = await this.stockRepository.findOne({
      where: { symbol: upper },
      relations: { stockCategory: true },
    });
    if (!stock) return;
    if (stock.stockCategory && stock.stockCategory.name !== 'Uncategorized')
      return; // already classified
    const result = await this.stockMetadata.classifySymbol(upper);
    if (!result || !result.category) return;
    try {
      await this.stockRepository.update(
        { id: stock.id },
        {
          stock_categories_id: result.category.id,
          updated_by: this.getSystemUserId(),
        },
      );
      this.logger.log(
        `Assigned category '${result.category.name}' to ${upper} (industry='${result.industry || 'unknown'}')`,
      );
    } catch (e) {
      this.logger.warn(
        `Failed to assign category for ${upper}: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
