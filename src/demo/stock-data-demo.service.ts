import { Injectable, Logger } from '@nestjs/common';
import { RealTimePriceService } from '../modules/stocks/services/real-time-price.service';
import { StocksService } from '../modules/stocks/stocks.service';
import type { CacheStats, CurrentPricesSummary } from './types/demo.types';

/**
 * Demo service showing how to use the real-time stock data features
 */
@Injectable()
export class StockDataDemoService {
  private readonly logger = new Logger(StockDataDemoService.name);

  constructor(
    private readonly realTimePriceService: RealTimePriceService,
    private readonly stocksService: StocksService,
  ) {}

  /**
   * Demo: Subscribe to real-time data for popular stocks
   */
  async subscribeToPopularStocks(): Promise<void> {
    const popularSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA'];

    for (const symbol of popularSymbols) {
      await this.realTimePriceService.subscribe(symbol);
      // If still no real quote (e.g., provider rate limit) simulate once
      if (!this.realTimePriceService.getCurrentPrice(symbol)) {
        await this.realTimePriceService.simulateMarketData(symbol);
      }
      this.logger.log(`Subscribed (demo) to real-time data for ${symbol}`);
    }
  }

  /**
   * Demo: Get current cached prices
   */
  getCurrentPrices(): CurrentPricesSummary[] {
    const stats = this.realTimePriceService.getCacheStats();
    const prices: CurrentPricesSummary[] = [];

    for (const symbol of stats.symbols) {
      const price = this.realTimePriceService.getCurrentPrice(symbol);
      if (price) {
        prices.push({
          symbol: price.symbol,
          price: price.price,
          change: price.change,
          changePercent: price.changePercent,
          volume: price.volume,
        });
      }
    }

    return prices;
  }

  /**
   * Demo: Start continuous market data simulation
   */
  startMarketDataSimulation(): void {
    const symbols = this.realTimePriceService.getSubscribedSymbols();

    // Update prices every 2-5 seconds
    setInterval(
      () => {
        void (async () => {
          for (const symbol of symbols) {
            await this.realTimePriceService.simulateMarketData(symbol);
          }
        })();
      },
      Math.random() * 3000 + 2000,
    ); // 2-5 second intervals

    this.logger.log(
      `Started market data simulation for ${symbols.length} symbols`,
    );
  }

  /**
   * Demo: Get cache statistics
   */
  getCacheStats(): CacheStats {
    return this.realTimePriceService.getCacheStats();
  }
}

/**
 * Example usage in a controller:
 *
 * @Controller('demo')
 * export class DemoController {
 *   constructor(private readonly demoService: StockDataDemoService) {}
 *
 *   @Post('start')
 *   async startDemo() {
 *     await this.demoService.subscribeToPopularStocks();
 *     this.demoService.startMarketDataSimulation();
 *     return { message: 'Real-time stock data demo started' };
 *   }
 *
 *   @Get('prices')
 *   async getCurrentPrices() {
 *     return this.demoService.getCurrentPrices();
 *   }
 *
 *   @Get('stats')
 *   getStats() {
 *     return this.demoService.getCacheStats();
 *   }
 * }
 */
