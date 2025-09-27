import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StockDataDemoService } from './stock-data-demo.service';
import { RealTimePriceService } from '../modules/stocks/services/real-time-price.service';
import type {
  DemoStartResponse,
  SubscriptionResponse,
  StockPriceResponse,
  PriceUpdateResponse,
  HealthStatusResponse,
  CacheStats,
  CurrentPricesSummary,
} from './types/demo.types';

@ApiTags('Demo')
@Controller('demo')
export class DemoController {
  constructor(
    private readonly demoService: StockDataDemoService,
    private readonly realTimePriceService: RealTimePriceService,
  ) {}

  @Post('start')
  @ApiOperation({
    summary: 'Start real-time stock data demo',
    description:
      'Subscribes to popular stocks and starts market data simulation',
  })
  @ApiResponse({
    status: 200,
    description: 'Demo started successfully',
  })
  async startDemo(): Promise<DemoStartResponse> {
    await this.demoService.subscribeToPopularStocks();
    this.demoService.startMarketDataSimulation();

    const stats = this.demoService.getCacheStats();

    return {
      message: 'Real-time stock data demo started',
      subscribedSymbols: stats.symbols,
      status: 'running',
      cacheSize: stats.size,
      lastUpdate: new Date().toISOString(),
    };
  }

  @Get('prices')
  @ApiOperation({
    summary: 'Get current stock prices',
    description: 'Returns current cached prices for all subscribed stocks',
  })
  @ApiResponse({
    status: 200,
    description: 'Current stock prices',
  })
  getCurrentPrices(): CurrentPricesSummary[] {
    return this.demoService.getCurrentPrices();
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get cache statistics',
    description:
      'Returns cache statistics including size, symbols, and last update times',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics',
  })
  getStats(): CacheStats {
    return this.demoService.getCacheStats();
  }

  @Post('subscribe/:symbol')
  @ApiOperation({
    summary: 'Subscribe to a specific stock',
    description: 'Subscribe to real-time updates for a specific stock symbol',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully subscribed to stock',
  })
  async subscribeToStock(
    @Param('symbol') symbol: string,
  ): Promise<SubscriptionResponse> {
    await this.realTimePriceService.subscribe(symbol.toUpperCase());

    // If still no real quote, perform one simulation to seed data
    if (!this.realTimePriceService.getCurrentPrice(symbol.toUpperCase())) {
      await this.realTimePriceService.simulateMarketData(symbol.toUpperCase());
    }

    return {
      message: `Successfully subscribed to ${symbol.toUpperCase()}`,
      symbol: symbol.toUpperCase(),
      status: 'subscribed',
    };
  }

  @Get('price/:symbol')
  @ApiOperation({
    summary: 'Get current price for specific stock',
    description: 'Returns current cached price for a specific stock symbol',
  })
  @ApiResponse({
    status: 200,
    description: 'Current stock price',
  })
  getStockPrice(@Param('symbol') symbol: string): StockPriceResponse {
    const price = this.realTimePriceService.getCurrentPrice(
      symbol.toUpperCase(),
    );

    if (!price) {
      return {
        error: 'Stock not found or not subscribed',
        symbol: symbol.toUpperCase(),
        suggestion: `Use POST /demo/subscribe/${symbol.toUpperCase()} to subscribe first`,
      };
    }

    return price;
  }

  @Post('simulate/:symbol')
  @ApiOperation({
    summary: 'Trigger manual price update',
    description: 'Manually trigger a price update simulation for testing',
  })
  @ApiResponse({
    status: 200,
    description: 'Price update triggered',
  })
  async simulatePriceUpdate(
    @Param('symbol') symbol: string,
  ): Promise<PriceUpdateResponse> {
    // Prefer fetching a real quote first
    await this.realTimePriceService.fetchAndUpdate(symbol.toUpperCase(), true);
    if (!this.realTimePriceService.getCurrentPrice(symbol.toUpperCase())) {
      await this.realTimePriceService.simulateMarketData(symbol.toUpperCase());
    }
    const updatedPrice = this.realTimePriceService.getCurrentPrice(
      symbol.toUpperCase(),
    );

    return {
      message: `Price update simulated for ${symbol.toUpperCase()}`,
      symbol: symbol.toUpperCase(),
      newPrice: updatedPrice,
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check for demo system',
    description: 'Returns system health status and component availability',
  })
  @ApiResponse({
    status: 200,
    description: 'System health status',
  })
  getHealthStatus(): HealthStatusResponse {
    const stats = this.demoService.getCacheStats();
    const subscribedSymbols = this.realTimePriceService.getSubscribedSymbols();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        demoService: 'active',
        realTimePriceService: 'active',
        webSocketGateway: 'active',
      },
      cache: {
        size: stats.size,
        symbols: stats.symbols,
      },
      subscriptions: {
        count: subscribedSymbols.length,
        symbols: subscribedSymbols,
      },
    };
  }
}
