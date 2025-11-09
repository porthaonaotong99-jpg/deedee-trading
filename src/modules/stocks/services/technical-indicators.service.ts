import { Injectable, Logger } from '@nestjs/common';
import {
  AlphaVantageMarketMoversResponse,
  AlphaVantageStock,
  AlphaVantageMoverCategory,
  FinnhubResolution,
  FinnhubSupportResistanceResponse,
  MarketMoverStock,
  MarketMoversResponse,
  PolygonRsiResponse,
  RSISignal,
  SupportBreakLoser,
  SupportBreakLosersResponse,
  StockNewsResponse,
  StockOverviewResponse,
  StockPerformanceEntry,
  StockPerformanceResponse,
  StockPriceHistoryRange,
  StockPriceHistoryResponse,
  StockPricePoint,
  StockRevenueResponse,
  SupportLevelsSnapshot,
  USMarketRsiResponse,
} from './technical-indicators.types';
import { StockMetadataService } from './stock-metadata.service';
import { QuotesService } from './quotes.service';

interface FinnhubCandlePayload {
  s?: 'ok' | 'no_data';
  c?: number[];
  t?: number[];
  v?: number[];
}

type AlphaInterval =
  | '1min'
  | '5min'
  | '15min'
  | '30min'
  | '60min'
  | 'daily'
  | 'weekly'
  | 'monthly';

type PolygonTimespan = 'minute' | 'hour' | 'day' | 'week' | 'month';

@Injectable()
export class TechnicalIndicatorsService {
  private readonly logger = new Logger(TechnicalIndicatorsService.name);
  private readonly alphaVantageApiKey = process.env.ALPHA_VANTAGE_KEY;
  private readonly polygonApiKey = process.env.POLYGON_API_KEY;
  private readonly finnhubApiKey = process.env.FINNHUB_KEY;
  private readonly allowedUsExchanges = new Set<string>([
    'NASDAQ',
    'NYSE',
    'NYSEARCA',
    'NYSEAMERICAN',
    'NYSEMKT',
    'AMEX',
    'CBOE',
    'BATS',
    'ARCA',
    'NASDAQGS',
    'NASDAQCM',
    'NASDAQGM',
    'XNYS',
    'XNAS',
    'XNCM',
    'XNMS',
    'XASE',
    'ARCX',
    'BATSZ',
    'EDGX',
    'EDGA',
    'IEX',
  ]);
  private readonly blockedExchangePrefixes = new Set<string>([
    'OTC',
    'OTCMKTS',
    'OTCBB',
    'OTCPK',
    'PINK',
    'TSX',
    'TSXV',
    'CSE',
    'CNQ',
    'BSE',
    'NSE',
    'LON',
    'ASX',
    'TSE',
    'SSE',
    'SZSE',
    'HKSE',
    'SGX',
    'FOREX',
    'CRYPTO',
    'INDEX',
  ]);
  private readonly usRegions = new Set<string>([
    'UNITED STATES',
    'UNITED STATES OF AMERICA',
    'USA',
    'US',
    'AMERICA',
  ]);
  private readonly symbolPattern = /^[A-Z0-9.-]+$/;

  constructor(
    private readonly stockMetadataService: StockMetadataService,
    private readonly quotesService: QuotesService,
  ) {
    if (!this.alphaVantageApiKey && !this.polygonApiKey) {
      this.logger.warn(
        'No market data provider configured. Please set ALPHA_VANTAGE_KEY and/or POLYGON_API_KEY.',
      );
    }
  }

  private classifyRsi(value: number): RSISignal['status'] {
    if (value <= 30) {
      return 'oversold';
    }
    if (value >= 70) {
      return 'overbought';
    }
    return 'neutral';
  }

  private parseNumericString(value: string): number | null {
    const cleaned = value.replace(/[%,$]/g, '').replace(/,/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeNumeric(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const parsed = Number(value.trim());
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private roundTo(
    value: number | null | undefined,
    decimals = 2,
  ): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (!Number.isFinite(value)) {
      return null;
    }
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  private parseBooleanString(value?: string): boolean | null {
    if (value === undefined || value === null) {
      return null;
    }
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    if (['true', '1', 'yes', 'y'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n'].includes(normalized)) {
      return false;
    }
    return null;
  }

  private isLikelyUsExchange(value?: string, regionIsUs = false): boolean {
    if (!value) {
      return false;
    }
    const upper = value.trim().toUpperCase();
    if (!upper) {
      return false;
    }
    if (this.blockedExchangePrefixes.has(upper)) {
      return false;
    }
    if (this.allowedUsExchanges.has(upper)) {
      return true;
    }
    if (
      upper.startsWith('NYSE') ||
      upper.startsWith('NASDAQ') ||
      upper.startsWith('BATS') ||
      upper.startsWith('CBOE') ||
      upper.startsWith('EDGX') ||
      upper.startsWith('EDGA') ||
      upper.startsWith('IEX') ||
      upper.startsWith('ARCX') ||
      upper.startsWith('XNY') ||
      upper.startsWith('XNA')
    ) {
      return true;
    }
    return regionIsUs;
  }

  private normalizeAlphaVantageTicker(stock: AlphaVantageStock): string | null {
    const rawTicker = stock.ticker?.trim();
    if (!rawTicker) {
      return null;
    }

    if (this.parseBooleanString(stock.is_etf) === true) {
      return null;
    }

    if (this.parseBooleanString(stock.is_actively_trading) === false) {
      return null;
    }

    const segments = rawTicker.split(':');
    let exchangePrefix: string | undefined;
    let symbolPart = rawTicker;

    if (segments.length > 1) {
      exchangePrefix = segments[0]?.trim().toUpperCase();
      symbolPart = segments.slice(1).join(':').trim();
    }

    const region = stock.region?.trim().toUpperCase();
    const regionIsUs = region ? this.usRegions.has(region) : false;
    if (region && !regionIsUs) {
      return null;
    }

    if (
      exchangePrefix &&
      !this.isLikelyUsExchange(exchangePrefix, regionIsUs) &&
      !regionIsUs
    ) {
      return null;
    }

    const marketValue = (stock.market ?? stock.exchange ?? '').trim();
    if (
      marketValue &&
      !this.isLikelyUsExchange(marketValue, regionIsUs) &&
      !regionIsUs
    ) {
      return null;
    }

    const symbol = (symbolPart || rawTicker).toUpperCase();
    if (!this.symbolPattern.test(symbol)) {
      return null;
    }

    return symbol;
  }

  private filterAlphaVantageStocks<T>(
    stocks: AlphaVantageStock[] | undefined,
    limit: number,
    mapper: (stock: AlphaVantageStock, symbol: string) => T,
  ): { items: T[]; skipped: string[] } {
    const items: T[] = [];
    const skipped: string[] = [];
    const seenSymbols = new Set<string>();

    for (const stock of stocks ?? []) {
      const normalizedSymbol = this.normalizeAlphaVantageTicker(stock);
      if (!normalizedSymbol) {
        if (stock.ticker) {
          skipped.push(stock.ticker);
        }
        continue;
      }

      if (seenSymbols.has(normalizedSymbol)) {
        continue;
      }

      seenSymbols.add(normalizedSymbol);
      items.push(mapper(stock, normalizedSymbol));

      if (items.length >= limit) {
        break;
      }
    }

    return { items, skipped };
  }

  private toMarketMoverStock(
    stock: AlphaVantageStock,
    symbol: string,
  ): MarketMoverStock {
    const price = this.parseNumericString(stock.price) ?? 0;
    const change = this.parseNumericString(stock.change_amount) ?? 0;
    const changePercent = this.parseNumericString(stock.change_percentage) ?? 0;
    const volume = this.parseNumericString(stock.volume);

    return {
      symbol,
      lastPrice: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      high: null,
      low: null,
      volume: volume !== null ? Math.round(volume) : null,
    };
  }

  private async fetchFinnhubSupportResistance(
    symbol: string,
    resolution: FinnhubResolution,
  ): Promise<FinnhubSupportResistanceResponse | null> {
    if (!this.finnhubApiKey) {
      this.logger.error(
        'Finnhub API key not available; support/resistance lookup disabled',
      );
      return null;
    }

    const upperSymbol = symbol.toUpperCase();
    const url = `https://finnhub.io/api/v1/support-resistance?symbol=${encodeURIComponent(upperSymbol)}&resolution=${resolution}&token=${this.finnhubApiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(
          `Finnhub support/resistance request failed for ${upperSymbol}: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const payload =
        (await response.json()) as Partial<FinnhubSupportResistanceResponse>;
      const levels = Array.isArray(payload.levels)
        ? payload.levels.filter(
            (value): value is number =>
              typeof value === 'number' && Number.isFinite(value),
          )
        : [];

      if (!levels.length) {
        this.logger.debug(
          `Finnhub returned no support/resistance levels for ${upperSymbol}`,
        );
        return null;
      }

      return {
        symbol: upperSymbol,
        levels,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching Finnhub support/resistance for ${upperSymbol}:`,
        error,
      );
      return null;
    }
  }

  private deriveSupportResistance(
    levels: number[],
    price: number,
  ): Pick<
    SupportBreakLoser,
    | 'supportLevel'
    | 'supportLevelSecondary'
    | 'resistance1'
    | 'resistance2'
    | 'belowSupportPercent'
    | 'distanceToSupportPercent'
  > {
    const sorted = levels
      .filter((value) => typeof value === 'number' && Number.isFinite(value))
      .sort((a, b) => a - b);

    if (!sorted.length) {
      return {
        supportLevel: null,
        supportLevelSecondary: null,
        resistance1: null,
        resistance2: null,
        belowSupportPercent: null,
        distanceToSupportPercent: null,
      };
    }

    const firstAboveIndex = sorted.findIndex((level) => level >= price);
    const supportLevel =
      firstAboveIndex >= 0
        ? sorted[firstAboveIndex]
        : sorted[sorted.length - 1];
    const supportLevelSecondary =
      firstAboveIndex >= 0
        ? (sorted[firstAboveIndex + 1] ?? null)
        : sorted.length > 1
          ? sorted[sorted.length - 2]
          : null;

    const resistance1 =
      firstAboveIndex >= 0 ? (sorted[firstAboveIndex + 1] ?? null) : null;
    const resistance2 =
      firstAboveIndex >= 0 ? (sorted[firstAboveIndex + 2] ?? null) : null;

    const deltaPercent =
      supportLevel !== null && supportLevel !== 0
        ? ((price - supportLevel) / supportLevel) * 100
        : null;

    return {
      supportLevel,
      supportLevelSecondary,
      resistance1,
      resistance2,
      belowSupportPercent: deltaPercent,
      distanceToSupportPercent:
        deltaPercent !== null ? Math.abs(deltaPercent) : null,
    };
  }

  private readonly performanceTimeframes: Array<{
    label: StockPerformanceEntry['timeframe'];
    days?: number;
    mode?: 'YTD';
  }> = [
    { label: '1D', days: 1 },
    { label: '1W', days: 7 },
    { label: '1M', days: 30 },
    { label: '3M', days: 90 },
    { label: '6M', days: 180 },
    { label: 'YTD', mode: 'YTD' },
    { label: '1Y', days: 365 },
  ];

  private resolveHistoryRange(range: StockPriceHistoryRange): {
    from: number;
    resolution: FinnhubResolution;
  } {
    const nowSeconds = Math.floor(Date.now() / 1000);
    switch (range) {
      case '1M':
        return { from: nowSeconds - 30 * 86400, resolution: 'D' };
      case '3M':
        return { from: nowSeconds - 90 * 86400, resolution: 'D' };
      case '6M':
        return { from: nowSeconds - 180 * 86400, resolution: 'D' };
      case '1Y':
        return { from: nowSeconds - 365 * 86400, resolution: 'D' };
      case 'YTD': {
        const now = new Date();
        const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0);
        return {
          from: Math.floor(startOfYear / 1000),
          resolution: 'D',
        };
      }
      default:
        return { from: nowSeconds - 180 * 86400, resolution: 'D' };
    }
  }

  private getPerformanceWindowStart(): number {
    // Fetch a little over one full year to support all timeframes reliably.
    return Math.floor(Date.now() / 1000) - 400 * 86400;
  }

  private async fetchFinnhubCandles(
    symbol: string,
    resolution: FinnhubResolution,
    from: number,
    to: number,
  ): Promise<FinnhubCandlePayload | null> {
    if (!this.finnhubApiKey) {
      return null;
    }

    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${this.finnhubApiKey}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(
          `Finnhub candle request failed for ${symbol} (${resolution}) status=${response.status}`,
        );
        return null;
      }
      const payload = (await response.json()) as FinnhubCandlePayload;
      if (!payload || payload.s !== 'ok') {
        this.logger.debug(
          `Finnhub candle payload not ok for ${symbol} (${resolution}) state=${payload?.s}`,
        );
        return null;
      }
      return payload;
    } catch (error) {
      this.logger.error(
        `Error fetching Finnhub candles for ${symbol} (${resolution})`,
        error,
      );
      return null;
    }
  }

  private mapCandlesToPoints(payload: FinnhubCandlePayload): StockPricePoint[] {
    const closes = Array.isArray(payload.c) ? payload.c : [];
    const timestamps = Array.isArray(payload.t) ? payload.t : [];
    const volumes = Array.isArray(payload.v) ? payload.v : [];
    const limit = Math.min(closes.length, timestamps.length);
    const points: StockPricePoint[] = [];

    for (let i = 0; i < limit; i += 1) {
      const close = closes[i];
      const ts = timestamps[i];
      if (typeof close !== 'number' || !Number.isFinite(close)) {
        continue;
      }
      if (typeof ts !== 'number' || !Number.isFinite(ts)) {
        continue;
      }
      const roundedClose = this.roundTo(close, 2) ?? close;
      const volume = volumes[i];
      points.push({
        timestamp: ts * 1000,
        date: new Date(ts * 1000).toISOString(),
        close: roundedClose,
        volume:
          typeof volume === 'number' && Number.isFinite(volume)
            ? Math.round(volume)
            : null,
      });
    }

    return points.sort((a, b) => a.timestamp - b.timestamp);
  }

  private findPointAtOrAfter(
    points: StockPricePoint[],
    targetMs: number,
  ): StockPricePoint | null {
    for (const point of points) {
      if (point.timestamp >= targetMs) {
        return point;
      }
    }
    return points.length ? points[0] : null;
  }

  private buildPerformanceEntries(
    points: StockPricePoint[],
  ): StockPerformanceEntry[] {
    if (!points.length) {
      return [];
    }

    const latest = points[points.length - 1];
    const nowMs = Date.now();

    return this.performanceTimeframes.map(({ label, days, mode }) => {
      let targetMs = nowMs;
      if (mode === 'YTD') {
        const now = new Date();
        targetMs = Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0);
      } else if (typeof days === 'number') {
        targetMs = nowMs - days * 86400 * 1000;
      }

      const baseline = this.findPointAtOrAfter(points, targetMs);
      if (!baseline || baseline.close === null) {
        return {
          timeframe: label,
          changePercent: null,
          startPrice: null,
          endPrice: latest.close ?? null,
          startDate: baseline?.date ?? null,
          endDate: latest.date,
        };
      }

      const change =
        baseline.close && baseline.close !== 0
          ? ((latest.close - baseline.close) / baseline.close) * 100
          : null;

      return {
        timeframe: label,
        changePercent: this.roundTo(change, 2),
        startPrice: this.roundTo(baseline.close, 2) ?? baseline.close,
        endPrice: this.roundTo(latest.close, 2) ?? latest.close,
        startDate: baseline.date,
        endDate: latest.date,
      };
    });
  }

  async getStockOverview(
    symbol: string,
    options?: {
      includeRsi?: boolean;
      supportResolution?: FinnhubResolution;
    },
  ): Promise<StockOverviewResponse> {
    const upper = symbol.toUpperCase();
    const includeRsi = options?.includeRsi ?? false;
    const supportResolution = options?.supportResolution ?? 'D';
    const supportEnabled = !!this.finnhubApiKey;

    const basicsPromise = this.stockMetadataService
      .getCompanyBasics(upper)
      .catch(() => null);

    const quotePromise = this.quotesService
      .getNormalizedQuote(upper)
      .catch((error) => {
        this.logger.debug(
          `Quote lookup failed for ${upper}: ${
            error instanceof Error ? error.message : error
          }`,
        );
        return null;
      });

    const [basics, quote] = await Promise.all([basicsPromise, quotePromise]);

    const priceValue =
      quote && typeof quote.price === 'number' ? quote.price : null;
    const priceSnapshot = quote
      ? {
          price: this.roundTo(priceValue, 2),
          change:
            typeof quote.change === 'number'
              ? this.roundTo(quote.change, 2)
              : null,
          changePercent:
            typeof quote.changePercent === 'number'
              ? this.roundTo(quote.changePercent, 2)
              : null,
          marketCap:
            typeof quote.marketCap === 'string' ? quote.marketCap : null,
          volume: typeof quote.volume === 'string' ? quote.volume : null,
          provider: null,
          timestamp: new Date(),
        }
      : null;

    let support: SupportLevelsSnapshot | null = null;
    let supportMessage: string | undefined;
    if (!supportEnabled) {
      supportMessage = 'Finnhub support levels disabled; FINNHUB_KEY missing';
    } else if (priceSnapshot && priceSnapshot.price !== null) {
      const currentPrice = priceSnapshot.price;
      const finnhubLevels = await this.fetchFinnhubSupportResistance(
        upper,
        supportResolution,
      );
      if (finnhubLevels) {
        const derived = this.deriveSupportResistance(
          finnhubLevels.levels,
          currentPrice,
        );
        support = {
          supportLevel: this.roundTo(derived.supportLevel, 2),
          supportLevelSecondary: this.roundTo(derived.supportLevelSecondary, 2),
          resistance1: this.roundTo(derived.resistance1, 2),
          resistance2: this.roundTo(derived.resistance2, 2),
          belowSupportPercent: this.roundTo(derived.belowSupportPercent, 2),
          distanceToSupportPercent: this.roundTo(
            derived.distanceToSupportPercent,
            2,
          ),
        };
      } else {
        supportMessage = 'No support levels returned by Finnhub';
      }
    }

    let rsi: RSISignal | null = null;
    if (includeRsi) {
      try {
        rsi = await this.getRSI(upper, { fallback: true });
      } catch (error) {
        this.logger.debug(
          `RSI lookup failed for ${upper}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    const companyName =
      basics?.name ?? (typeof quote?.name === 'string' ? quote.name : null);
    const country =
      basics?.country ??
      (typeof quote?.country === 'string' ? quote.country : null);

    return {
      symbol: upper,
      companyName: companyName ?? null,
      country: country ?? null,
      price: priceSnapshot,
      rsi: includeRsi ? rsi : null,
      support,
      metadata: {
        supportResolution,
        supportProviderEnabled: supportEnabled,
        includeRsi,
        timestamp: new Date(),
        message: supportMessage,
      },
    };
  }

  async getStockPriceHistory(
    symbol: string,
    range: StockPriceHistoryRange = '6M',
    supportResolution: FinnhubResolution = 'D',
  ): Promise<StockPriceHistoryResponse> {
    const upper = symbol.toUpperCase();
    const basics = await this.stockMetadataService
      .getCompanyBasics(upper)
      .catch(() => null);
    const { from, resolution } = this.resolveHistoryRange(range);
    const to = Math.floor(Date.now() / 1000);

    const baseResponse: StockPriceHistoryResponse = {
      symbol: upper,
      companyName: basics?.name ?? null,
      range,
      resolution,
      provider: 'finnhub',
      points: [],
      metadata: {
        from,
        to,
        count: 0,
        disabled: !this.finnhubApiKey,
        message: undefined,
      },
    };

    if (!this.finnhubApiKey) {
      baseResponse.metadata.message =
        'Finnhub API key not configured; cannot fetch price history';
      return baseResponse;
    }

    const candles = await this.fetchFinnhubCandles(upper, resolution, from, to);
    if (!candles) {
      baseResponse.metadata.message =
        'No candle data returned from Finnhub for requested range';
      return baseResponse;
    }

    const points = this.mapCandlesToPoints(candles);
    baseResponse.points = points;
    baseResponse.metadata.count = points.length;

    const latestClose = points.length ? points[points.length - 1].close : null;
    if (latestClose !== null && this.finnhubApiKey) {
      const supportLevels = await this.fetchFinnhubSupportResistance(
        upper,
        supportResolution,
      );
      if (supportLevels) {
        const derived = this.deriveSupportResistance(
          supportLevels.levels,
          latestClose,
        );
        baseResponse.support = {
          supportLevel: this.roundTo(derived.supportLevel, 2),
          supportLevelSecondary: this.roundTo(derived.supportLevelSecondary, 2),
          resistance1: this.roundTo(derived.resistance1, 2),
          resistance2: this.roundTo(derived.resistance2, 2),
          belowSupportPercent: this.roundTo(derived.belowSupportPercent, 2),
          distanceToSupportPercent: this.roundTo(
            derived.distanceToSupportPercent,
            2,
          ),
        };
      }
    }

    return baseResponse;
  }

  async getStockPerformance(symbol: string): Promise<StockPerformanceResponse> {
    const upper = symbol.toUpperCase();
    const basics = await this.stockMetadataService
      .getCompanyBasics(upper)
      .catch(() => null);
    const from = this.getPerformanceWindowStart();
    const to = Math.floor(Date.now() / 1000);

    const base: StockPerformanceResponse = {
      symbol: upper,
      companyName: basics?.name ?? null,
      entries: [],
      latestClose: null,
      metadata: {
        provider: 'finnhub',
        from,
        to,
        count: 0,
        disabled: !this.finnhubApiKey,
        message: undefined,
      },
    };

    if (!this.finnhubApiKey) {
      base.metadata.message =
        'Finnhub API key not configured; cannot compute performance';
      return base;
    }

    const candles = await this.fetchFinnhubCandles(upper, 'D', from, to);
    if (!candles) {
      base.metadata.message = 'No candle data returned from Finnhub';
      return base;
    }

    const points = this.mapCandlesToPoints(candles);
    base.metadata.count = points.length;
    if (!points.length) {
      base.metadata.message = 'Finnhub returned empty candle series';
      return base;
    }

    base.latestClose = points[points.length - 1].close;
    base.entries = this.buildPerformanceEntries(points);
    return base;
  }

  async getStockRevenueSeries(
    symbol: string,
    limit = 8,
  ): Promise<StockRevenueResponse> {
    const upper = symbol.toUpperCase();
    const basics = await this.stockMetadataService
      .getCompanyBasics(upper)
      .catch(() => null);
    const hasApiKey = !!process.env.FMP_API_KEY;

    const base: StockRevenueResponse = {
      symbol: upper,
      companyName: basics?.name ?? null,
      series: [],
      metadata: {
        provider: 'fmp',
        limit,
        hasApiKey,
        fetchedAt: new Date(),
        message: undefined,
      },
    };

    if (!hasApiKey) {
      base.metadata.message =
        'FMP_API_KEY not configured; cannot fetch revenue';
      return base;
    }

    const url = `https://financialmodelingprep.com/api/v3/income-statement/${encodeURIComponent(upper)}?period=quarter&limit=${limit}&apikey=${process.env.FMP_API_KEY}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        base.metadata.message = `FMP income statement failed with status ${response.status}`;
        return base;
      }
      const payload = (await response.json()) as Array<Record<string, unknown>>;
      if (!Array.isArray(payload) || !payload.length) {
        base.metadata.message = 'FMP returned no income statement data';
        return base;
      }

      const series = payload.map((entry, index) => {
        const revenue = this.normalizeNumeric(entry['revenue']);
        const currencyValue = entry['reportedCurrency'];
        const currency = this.asString(currencyValue);
        const fiscalDate = this.asString(entry['date']);
        const calendarYear = this.asString(entry['calendarYear']);
        const periodRaw = this.asString(entry['period']);
        const periodLabel =
          calendarYear && periodRaw
            ? `${calendarYear} ${periodRaw}`
            : fiscalDate;

        let yoyChangePercent: number | null = null;
        const comparison = payload[index + 4];
        if (comparison) {
          const comparisonRevenue = this.normalizeNumeric(
            comparison['revenue'],
          );
          if (revenue !== null && comparisonRevenue) {
            const delta = revenue - comparisonRevenue;
            if (comparisonRevenue !== 0) {
              yoyChangePercent = this.roundTo(
                (delta / comparisonRevenue) * 100,
                2,
              );
            }
          }
        }

        const periodValue = periodLabel ?? fiscalDate ?? `Index ${index + 1}`;

        return {
          period: periodValue,
          fiscalDateEnding: fiscalDate,
          calendarYear,
          revenue,
          yoyChangePercent,
          currency: currency ?? null,
        };
      });

      base.series = series;
      return base;
    } catch (error) {
      base.metadata.message = `Error fetching FMP income statement: ${
        error instanceof Error ? error.message : error
      }`;
      return base;
    }
  }

  async getStockNews(symbol: string, limit = 6): Promise<StockNewsResponse> {
    const upper = symbol.toUpperCase();
    const hasFmpKey = !!process.env.FMP_API_KEY;
    const hasFinnhubKey = !!this.finnhubApiKey;
    const metadata = {
      provider: hasFmpKey ? ('fmp' as const) : ('finnhub' as const),
      limit,
      hasApiKey: hasFmpKey || hasFinnhubKey,
      fetchedAt: new Date(),
      message: undefined as string | undefined,
    };

    if (!hasFmpKey && !hasFinnhubKey) {
      metadata.message =
        'No news providers configured; set FMP_API_KEY or FINNHUB_KEY';
      return {
        symbol: upper,
        items: [],
        metadata,
      };
    }

    if (hasFmpKey) {
      const url = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${encodeURIComponent(upper)}&limit=${limit}&apikey=${process.env.FMP_API_KEY}`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          const payload = (await response.json()) as Array<
            Record<string, unknown>
          >;
          if (Array.isArray(payload)) {
            const items = payload.map((item) => {
              const published = this.asString(item['publishedDate']) ?? null;
              const headline =
                this.asString(item['title']) ?? 'Unknown headline';
              const source = this.asString(item['site']) ?? null;
              const urlValue = this.asString(item['url']) ?? null;
              const summary = this.asString(item['text']) ?? null;
              const imageUrl = this.asString(item['image']) ?? null;
              return {
                headline,
                source,
                url: urlValue,
                summary,
                publishedAt: published,
                imageUrl,
              };
            });

            return {
              symbol: upper,
              items,
              metadata,
            };
          }
        } else {
          metadata.message = `FMP news request failed with status ${response.status}`;
        }
      } catch (error) {
        metadata.message = `Error fetching FMP news: ${
          error instanceof Error ? error.message : error
        }`;
      }
    }

    if (hasFinnhubKey) {
      const now = new Date();
      const to = now.toISOString().substring(0, 10);
      const from = new Date(now.getTime() - 30 * 86400 * 1000)
        .toISOString()
        .substring(0, 10);
      const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(upper)}&from=${from}&to=${to}&token=${this.finnhubApiKey}`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          const payload = (await response.json()) as Array<
            Record<string, unknown>
          >;
          if (Array.isArray(payload)) {
            const capped = payload.slice(0, limit);
            const items = capped.map((item) => {
              const published =
                typeof item.datetime === 'number'
                  ? new Date(item.datetime * 1000).toISOString()
                  : null;
              const headline =
                this.asString(item['headline']) ?? 'Unknown headline';
              const source = this.asString(item['source']) ?? null;
              const urlValue = this.asString(item['url']) ?? null;
              const summary = this.asString(item['summary']) ?? null;
              const imageUrl = this.asString(item['image']) ?? null;
              return {
                headline,
                source,
                url: urlValue,
                summary,
                publishedAt: published,
                imageUrl,
              };
            });

            metadata.provider = 'finnhub';
            return {
              symbol: upper,
              items,
              metadata,
            };
          }
        } else {
          metadata.message = `Finnhub news request failed with status ${response.status}`;
        }
      } catch (error) {
        metadata.message = `Error fetching Finnhub news: ${
          error instanceof Error ? error.message : error
        }`;
      }
    }

    return {
      symbol: upper,
      items: [],
      metadata,
    };
  }

  async getAlphaVantageRSI(
    symbol: string,
    interval: AlphaInterval = 'daily',
    timeperiod = 14,
  ): Promise<RSISignal | null> {
    if (!this.alphaVantageApiKey) {
      this.logger.error('Alpha Vantage API key not available');
      return null;
    }

    try {
      const upperSymbol = symbol.toUpperCase();
      const url = `https://www.alphavantage.co/query?function=RSI&symbol=${upperSymbol}&interval=${interval}&time_period=${timeperiod}&series_type=close&apikey=${this.alphaVantageApiKey}`;
      this.logger.debug(
        `Fetching Alpha Vantage RSI for ${upperSymbol}: ${url.replace(/apikey=[^&]+/, 'apikey=***')}`,
      );

      const response = await fetch(url);
      if (!response.ok) {
        this.logger.error(
          `Alpha Vantage RSI API failed for ${upperSymbol}: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const payload = (await response.json()) as Record<string, unknown>;
      const rsiSection = payload['Technical Analysis: RSI'];
      if (!rsiSection || typeof rsiSection !== 'object') {
        this.logger.warn(`No Alpha Vantage RSI data for ${upperSymbol}`);
        return null;
      }

      const entries = Object.keys(rsiSection as Record<string, unknown>);
      if (!entries.length) {
        this.logger.warn(`No Alpha Vantage RSI entries for ${upperSymbol}`);
        return null;
      }

      const latestDate = entries.sort().pop();
      if (!latestDate) {
        this.logger.warn(
          `Unable to determine latest RSI date for ${upperSymbol}`,
        );
        return null;
      }

      const latestRecord = (
        rsiSection as Record<string, Record<string, string>>
      )[latestDate];
      const latestValue = this.parseNumericString(latestRecord?.RSI ?? '');
      if (latestValue === null) {
        this.logger.warn(`Invalid Alpha Vantage RSI value for ${upperSymbol}`);
        return null;
      }

      const rounded = Math.round(latestValue * 100) / 100;
      const status = this.classifyRsi(rounded);

      this.logger.debug(
        `Alpha Vantage RSI for ${upperSymbol}: ${rounded.toFixed(2)} (${status})`,
      );

      return {
        symbol: upperSymbol,
        rsi: rounded,
        status,
        timestamp: new Date(latestDate),
        provider: 'alphaVantage',
      };
    } catch (error) {
      this.logger.error('Error fetching Alpha Vantage RSI:', error);
      return null;
    }
  }

  async getPolygonRSI(
    symbol: string,
    timespan: PolygonTimespan = 'day',
    window = 14,
  ): Promise<RSISignal | null> {
    if (!this.polygonApiKey) {
      this.logger.error('Polygon API key not available');
      return null;
    }

    try {
      const upperSymbol = symbol.toUpperCase();
      const windowSize = window ?? 14;
      const url = `https://api.polygon.io/v1/indicators/rsi/${upperSymbol}?timespan=${timespan}&adjusted=true&window=${windowSize}&series_type=close&order=desc&limit=1&apiKey=${this.polygonApiKey}`;
      this.logger.debug(
        `Fetching Polygon RSI for ${upperSymbol}: ${url.replace(/apiKey=[^&]+/, 'apiKey=***')}`,
      );

      const response = await fetch(url);
      if (!response.ok) {
        this.logger.error(
          `Polygon RSI API failed for ${upperSymbol}: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const payload = (await response.json()) as PolygonRsiResponse;
      const latest = payload.results?.values?.[0];
      if (
        payload.status !== 'OK' ||
        !latest ||
        typeof latest.value !== 'number'
      ) {
        this.logger.warn(`No Polygon RSI data available for ${upperSymbol}`);
        return null;
      }

      const rounded = Math.round(latest.value * 100) / 100;
      const status = this.classifyRsi(rounded);

      this.logger.debug(
        `Polygon RSI for ${upperSymbol}: ${rounded.toFixed(2)} (${status})`,
      );

      return {
        symbol: upperSymbol,
        rsi: rounded,
        status,
        timestamp: new Date(latest.timestamp),
        provider: 'polygon',
      };
    } catch (error) {
      this.logger.error('Error fetching Polygon RSI:', error);
      return null;
    }
  }

  async getRSI(
    symbol: string,
    {
      provider,
      interval = 'daily',
      timeperiod = 14,
      timespan = 'day',
      window,
      fallback = true,
    }: {
      provider?: 'polygon' | 'alphaVantage';
      interval?: AlphaInterval;
      timeperiod?: number;
      timespan?: PolygonTimespan;
      window?: number;
      fallback?: boolean;
    } = {},
  ): Promise<RSISignal | null> {
    const preferredProvider =
      provider ?? (this.polygonApiKey ? 'polygon' : 'alphaVantage');

    if (preferredProvider === 'polygon') {
      const polygonResult = await this.getPolygonRSI(
        symbol,
        timespan,
        window ?? timeperiod,
      );

      if (polygonResult || provider === 'polygon' || !fallback) {
        return polygonResult;
      }
    }

    return this.getAlphaVantageRSI(symbol, interval, timeperiod);
  }

  private async fetchAlphaVantageMarketMovers(): Promise<AlphaVantageMarketMoversResponse | null> {
    if (!this.alphaVantageApiKey) {
      this.logger.error('Alpha Vantage API key not available');
      return null;
    }

    try {
      const url = `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${this.alphaVantageApiKey}`;
      this.logger.debug('Fetching Alpha Vantage top gainers/losers universe');

      const response = await fetch(url);
      if (!response.ok) {
        this.logger.error(
          `Alpha Vantage market movers request failed: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const payload =
        (await response.json()) as Partial<AlphaVantageMarketMoversResponse>;

      if (
        !payload.top_gainers?.length &&
        !payload.top_losers?.length &&
        !payload.most_actively_traded?.length
      ) {
        this.logger.warn('Alpha Vantage returned no market mover data');
        return null;
      }

      return {
        metadata: payload.metadata ?? '',
        last_updated: payload.last_updated ?? new Date().toISOString(),
        top_gainers: payload.top_gainers ?? [],
        top_losers: payload.top_losers ?? [],
        most_actively_traded: payload.most_actively_traded ?? [],
      };
    } catch (error) {
      this.logger.error('Error fetching Alpha Vantage market movers:', error);
      return null;
    }
  }

  async getAlphaVantageMarketMovers(
    limitPerCategory = 10,
  ): Promise<MarketMoversResponse | null> {
    const payload = await this.fetchAlphaVantageMarketMovers();
    if (!payload) {
      return null;
    }

    const limit = Math.max(1, limitPerCategory);
    const gainersResult = this.filterAlphaVantageStocks(
      payload.top_gainers,
      limit,
      (stock, symbol) => this.toMarketMoverStock(stock, symbol),
    );
    const losersResult = this.filterAlphaVantageStocks(
      payload.top_losers,
      limit,
      (stock, symbol) => this.toMarketMoverStock(stock, symbol),
    );

    const topGainers = gainersResult.items;
    const topLosers = losersResult.items;

    const skippedTickers = [...gainersResult.skipped, ...losersResult.skipped];
    if (skippedTickers.length) {
      this.logger.debug(
        `Skipped ${skippedTickers.length} non-US or inactive tickers from Alpha Vantage movers: ${skippedTickers.join(', ')}`,
      );
    }

    this.logger.log(
      `Alpha Vantage market movers fetched (${topGainers.length} gainers, ${topLosers.length} losers)`,
    );

    const timestamp = payload.last_updated
      ? new Date(payload.last_updated)
      : new Date();

    return {
      topGainers,
      topLosers,
      timestamp,
    };
  }

  async getUSLosersBreakingSupport({
    limit = 10,
    tolerancePercent = 8,
    minDropPercent = 0.5,
    resolution = 'D',
  }: {
    limit?: number;
    tolerancePercent?: number;
    minDropPercent?: number;
    resolution?: FinnhubResolution;
  } = {}): Promise<SupportBreakLosersResponse | null> {
    if (!this.finnhubApiKey) {
      this.logger.error(
        'Finnhub API key not available; cannot compute US support-break losers',
      );
      return null;
    }

    const normalizedLimit = Math.max(1, limit);
    const normalizedTolerance = tolerancePercent >= 0 ? tolerancePercent : 1;
    const normalizedDrop = minDropPercent >= 0 ? minDropPercent : 0;

    const movers = await this.getAlphaVantageMarketMovers(normalizedLimit * 4);
    if (!movers) {
      return null;
    }

    const losers = movers.topLosers ?? [];
    const inspectionCount = Math.min(losers.length, normalizedLimit * 4);
    const candidates: SupportBreakLoser[] = [];
    const skippedSymbols: Array<{ symbol: string; reason: string }> = [];
    let inspected = 0;

    for (const loser of losers.slice(0, inspectionCount)) {
      inspected += 1;

      if (loser.changePercent >= 0) {
        skippedSymbols.push({
          symbol: loser.symbol,
          reason: 'NOT_NEGATIVE',
        });
        continue;
      }

      if (
        normalizedDrop > 0 &&
        Math.abs(loser.changePercent) < normalizedDrop
      ) {
        skippedSymbols.push({
          symbol: loser.symbol,
          reason: 'DROP_TOO_SMALL',
        });
        continue;
      }

      const supportData = await this.fetchFinnhubSupportResistance(
        loser.symbol,
        resolution,
      );

      if (!supportData) {
        skippedSymbols.push({
          symbol: loser.symbol,
          reason: 'NO_LEVELS',
        });
        continue;
      }

      const {
        supportLevel,
        supportLevelSecondary,
        resistance1,
        resistance2,
        belowSupportPercent,
        distanceToSupportPercent,
      } = this.deriveSupportResistance(supportData.levels, loser.lastPrice);

      const nearSupport =
        belowSupportPercent != null &&
        belowSupportPercent > 0 &&
        belowSupportPercent <= normalizedTolerance;

      const breachedSupport =
        belowSupportPercent != null &&
        belowSupportPercent <= 0 &&
        Math.abs(belowSupportPercent) <= normalizedTolerance;

      if (!nearSupport && !breachedSupport) {
        skippedSymbols.push({
          symbol: loser.symbol,
          reason: 'DISTANCE_TOLERANCE',
        });
        continue;
      }

      let companyName: string | null = null;
      try {
        const basics = await this.stockMetadataService.getCompanyBasics(
          loser.symbol,
        );
        companyName = basics?.name ?? null;
      } catch (metadataError) {
        this.logger.debug(
          `Company metadata lookup failed for ${loser.symbol}: ${metadataError instanceof Error ? metadataError.message : 'unknown error'}`,
        );
      }

      const normalizedSupportLevel = this.roundTo(supportLevel);
      const normalizedSecondarySupport = this.roundTo(supportLevelSecondary);
      const normalizedResistance1 = this.roundTo(resistance1);
      const normalizedResistance2 = this.roundTo(resistance2);
      const normalizedBelowSupportPercent = this.roundTo(belowSupportPercent);
      const normalizedDistancePercent = this.roundTo(distanceToSupportPercent);

      candidates.push({
        symbol: loser.symbol,
        companyName,
        lastPrice: loser.lastPrice,
        changePercent: loser.changePercent,
        change: loser.change,
        volume: loser.volume ?? null,
        supportLevel: normalizedSupportLevel,
        supportLevelSecondary: normalizedSecondarySupport,
        resistance1: normalizedResistance1,
        resistance2: normalizedResistance2,
        belowSupportPercent: normalizedBelowSupportPercent,
        distanceToSupportPercent: normalizedDistancePercent,
      });

      if (candidates.length >= normalizedLimit) {
        break;
      }
    }

    return {
      timestamp: new Date(),
      stocks: candidates,
      metadata: {
        limitRequested: normalizedLimit,
        inspected,
        produced: candidates.length,
        tolerancePercent: normalizedTolerance,
        minDropPercent: normalizedDrop,
        resolution,
        skippedSymbols,
      },
    };
  }

  async getUSMarketRsi({
    limitPerCategory = 25,
    provider,
    interval = 'daily',
    timeperiod = 14,
    timespan = 'day',
    window,
    fallback = true,
  }: {
    limitPerCategory?: number;
    provider?: 'polygon' | 'alphaVantage';
    interval?: AlphaInterval;
    timeperiod?: number;
    timespan?: PolygonTimespan;
    window?: number;
    fallback?: boolean;
  } = {}): Promise<USMarketRsiResponse | null> {
    const payload = await this.fetchAlphaVantageMarketMovers();
    if (!payload) {
      return null;
    }

    const categories: AlphaVantageMoverCategory[] = [
      'top_gainers',
      'top_losers',
      'most_actively_traded',
    ];

    const limit = Math.max(1, limitPerCategory);

    const categorySymbols: Record<AlphaVantageMoverCategory, string[]> = {
      top_gainers: [],
      top_losers: [],
      most_actively_traded: [],
    };
    const skippedByCategory: Record<AlphaVantageMoverCategory, string[]> = {
      top_gainers: [],
      top_losers: [],
      most_actively_traded: [],
    };

    for (const category of categories) {
      const { items, skipped } = this.filterAlphaVantageStocks(
        payload[category],
        limit,
        (_, symbol) => symbol,
      );
      categorySymbols[category] = items;
      skippedByCategory[category] = skipped;
    }

    const skippedSummary = categories.flatMap(
      (category) => skippedByCategory[category],
    );
    if (skippedSummary.length) {
      this.logger.debug(
        `Skipped ${skippedSummary.length} non-US or inactive tickers when building RSI universe: ${skippedSummary.join(', ')}`,
      );
    }

    const uniqueSymbols = Array.from(
      new Set(categories.flatMap((category) => categorySymbols[category])),
    );

    this.logger.log(
      `Fetching RSI for ${uniqueSymbols.length} US tickers from Alpha Vantage movers universe (limit ${limit})`,
    );

    const signals: RSISignal[] = [];
    const failedSymbols: string[] = [];

    for (const ticker of uniqueSymbols) {
      const signal = await this.getRSI(ticker, {
        provider,
        interval,
        timeperiod,
        timespan,
        window,
        fallback,
      });

      if (signal) {
        signals.push(signal);
      } else {
        failedSymbols.push(ticker);
      }
    }

    const timestamp = payload.last_updated
      ? new Date(payload.last_updated)
      : new Date();

    return {
      timestamp,
      symbols: signals,
      failedSymbols,
      metadata: {
        limitPerCategory: limit,
        totalRequested: uniqueSymbols.length,
        providerPreference: provider ?? 'auto',
        categories: categorySymbols,
        skippedTickers: skippedByCategory,
      },
    };
  }
}
