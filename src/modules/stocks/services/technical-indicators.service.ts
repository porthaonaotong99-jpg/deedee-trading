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
  USMarketRsiResponse,
} from './technical-indicators.types';
import { StockMetadataService } from './stock-metadata.service';

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

  constructor(private readonly stockMetadataService: StockMetadataService) {
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
