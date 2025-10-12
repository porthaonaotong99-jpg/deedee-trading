import { Injectable } from '@nestjs/common';
import {
  ExternalPriceFetcherService,
  ExternalQuote,
} from './external-price-fetcher.service';
import { RealTimePriceService } from './real-time-price.service';

@Injectable()
export class QuotesService {
  constructor(
    private readonly fetcher: ExternalPriceFetcherService,
    private readonly realTime: RealTimePriceService,
  ) {}

  // Fetch, persist minimal price state, enrich with stock metadata, and normalize payload
  async getNormalizedQuote(symbol: string): Promise<Record<string, unknown>> {
    const sym = symbol.toUpperCase();

    const quote: ExternalQuote | null = await this.fetcher.fetchQuote(sym);
    if (!quote) {
      class NoQuoteError extends Error {
        code = 'NO_QUOTE';
      }
      throw new NoQuoteError('No free provider returned a quote at this time');
    }

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

    await this.realTime.ensureSymbol(sym);
    const stockWithCat = await this.realTime.getStockWithCategory(sym);

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
      id: stockWithCat?.id || null,
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

    return payload;
  }
}
