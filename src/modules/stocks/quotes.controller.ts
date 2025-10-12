import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ExternalPriceFetcherService,
  ExternalQuote,
} from './services/external-price-fetcher.service';
import { RealTimePriceService } from './services/real-time-price.service';
import {
  handleError,
  handleSuccessOne,
} from '../../common/utils/response.util';

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
    try {
      // Fetch external quote first. We only persist if quote is valid.
      const quote: ExternalQuote | null = await this.fetcher.fetchQuote(sym);
      console.log({ quote });
      if (!quote) {
        return handleError({
          code: 'NO_QUOTE',
          message: 'No free provider returned a quote at this time',
          error: { symbol: sym },
          statusCode: 503,
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

      // Enrich metadata and fetch stock row (company name, country, category)
      await this.realTime.ensureSymbol(sym);
      const stockWithCat = await this.realTime.getStockWithCategory(sym);

      // Helpers to format big numbers
      const fmtVolume = (v?: number | null) => {
        if (!v && v !== 0) return null;
        if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
        if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
        if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
        return String(v);
      };
      const fmtMarketCap = (v?: number | null) => {
        if (!v && v !== 0) return null;
        if (v >= 1_000_000_000_000)
          return `${(v / 1_000_000_000_000).toFixed(1)}T`;
        if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
        if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
        return String(v);
      };

      const payload = {
        symbol: quote.symbol,
        name: stockWithCat?.company || stockWithCat?.name || sym,
        price: quote.price,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        market: stockWithCat?.exchange || 'SMART',
        country: stockWithCat?.country || null,
        marketCap: fmtMarketCap(stockWithCat?.market_cap ?? null),
        pe: stockWithCat?.pe_ratio ?? null,
        volume: fmtVolume(quote.volume ?? stockWithCat?.volume ?? null),
      };

      return handleSuccessOne({
        data: payload,
        message: 'Normalized quote returned',
      });
    } catch (error) {
      return handleError({
        code: 'QUOTE_ERROR',
        message: 'Failed to retrieve or persist quote',
        error,
        statusCode: 500,
      });
    }
  }
}
