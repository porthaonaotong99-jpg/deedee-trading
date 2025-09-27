import {
  Controller,
  Get,
  Param,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ExternalPriceFetcherService,
  ExternalQuote,
} from './services/external-price-fetcher.service';
import { RealTimePriceService } from './services/real-time-price.service';

@ApiTags('stock-quotes')
@Controller('stocks')
export class StockQuotesController {
  constructor(
    private readonly fetcher: ExternalPriceFetcherService,
    private readonly realTime: RealTimePriceService,
  ) {}

  @Get('quote/:symbol')
  @ApiOperation({
    summary: 'Get latest free quote (best-effort, may be delayed)',
  })
  @ApiResponse({
    status: 200,
    description: 'Normalized quote returned',
    schema: {
      example: {
        symbol: 'AAPL',
        price: 189.55,
        open: 190.1,
        high: 191.0,
        low: 188.7,
        previousClose: 191.4,
        volume: 54321000,
        provider: 'yahoo',
        timestamp: '2025-09-27T14:00:12.123Z',
        disclaimer:
          'Data may be delayed and is provided for informational purposes only.',
      },
    },
  })
  async getQuote(@Param('symbol') symbol: string) {
    const sym = symbol.toUpperCase();
    // Fetch external quote first. We only persist if quote is valid.
    const quote: ExternalQuote | null = await this.fetcher.fetchQuote(sym);

    if (!quote) {
      throw new ServiceUnavailableException({
        symbol: sym,
        error: 'NO_QUOTE',
        message: 'No free provider returned a quote at this time',
        disclaimer:
          'Data unavailable from free providers right now. Try again shortly.',
      });
    }

    // Persist quote (auto) regardless of save flag; legacy ?save kept for backwards compatibility
    const previousClose = quote.previousClose ?? quote.price;
    const change = quote.price - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    await this.realTime.updatePrice(sym, {
      symbol: sym,
      price: quote.price,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: quote.volume ?? 0,
      bidPrice: quote.bid,
      askPrice: quote.ask,
      bidSize: quote.bidSize,
      askSize: quote.askSize,
      high: quote.high ?? quote.price,
      low: quote.low ?? quote.price,
      open: quote.open ?? quote.price,
      previousClose: previousClose,
      source: 'EXTERNAL',
      provider: quote.provider,
    });

    // Now fetch enriched stock + category (lazy classification may be triggered inside)
    const stockWithCat = await this.realTime.getStockWithCategory(sym);

    return {
      symbol: quote.symbol,
      price: quote.price,
      open: quote.open ?? null,
      high: quote.high ?? null,
      low: quote.low ?? null,
      previousClose: previousClose,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: quote.volume ?? null,
      provider: quote.provider,
      timestamp: quote.timestamp,
      categoryId: stockWithCat?.categoryId || null,
      categoryName: stockWithCat?.categoryName || null,
      disclaimer:
        'Data may be delayed and is provided for informational purposes only.',
      persisted: true,
    };
  }
}
