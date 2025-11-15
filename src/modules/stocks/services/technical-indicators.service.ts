import { Injectable, Logger } from '@nestjs/common';
import {
  AlphaVantageMarketMoversResponse,
  AlphaVantageStock,
  MarketMoverStock,
  MarketMoversResponse,
  PolygonRsiResponse,
  PriceResolution,
  RSISignal,
  StockNewsResponse,
  StockOverviewResponse,
  StockPerformanceEntry,
  StockPerformanceResponse,
  StockPriceHistoryRange,
  StockPriceHistoryResponse,
  StockPricePoint,
  StockRevenueResponse,
  SupportBreakLoser,
  SupportBreakLosersResponse,
  SupportLevelsSnapshot,
  USMarketRsiBucketResponse,
  USMarketRsiBucketStock,
} from './technical-indicators.types';
import { StockMetadataService } from './stock-metadata.service';
import { QuotesService } from './quotes.service';

interface PolygonAggregatePayload {
  results?: Array<{
    c?: number;
    h?: number;
    l?: number;
    o?: number;
    v?: number;
    t?: number;
  }>;
  status?: string;
}

interface AlphaVantageDailySeries {
  [date: string]: {
    '1. open'?: string;
    '2. high'?: string;
    '3. low'?: string;
    '4. close'?: string;
    '5. adjusted close'?: string;
    '6. volume'?: string;
  };
}

interface PolygonNewsPayload {
  results?: Array<{
    title?: string;
    description?: string;
    article_url?: string;
    image_url?: string;
    published_utc?: string;
    publisher?: { name?: string };
  }>;
  status?: string;
}

interface GoogleSupportBreakRow {
  Ticker?: string;
  Price?: number | string;
  'Change %'?: number | string;
  'Support 1'?: number | string;
  'Support 2'?: number | string;
  'Resistance 1'?: number | string;
  'Resistance 2'?: number | string;
  RSI?: number | string;
  'EMA 50'?: number | string;
  'EMA 200'?: number | string;
  'Company name'?: string;
  Group?: string;
}

interface GoogleSupportBreakResponse {
  error?: boolean;
  data?: GoogleSupportBreakRow[];
  count?: number;
}

interface GoogleUsMarketRsiRow {
  Ticker?: string;
  RSI?: number | string;
  Price?: number | string;
  'Change %'?: number | string;
  Change?: number | string;
  Group?: string;
  'Company name'?: string;
  'Last Updated'?: string;
  'Updated At'?: string;
}

interface GoogleUsMarketRsiResponse {
  error?: boolean;
  data?: GoogleUsMarketRsiRow[];
  count?: number;
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
  private readonly supportBreakSourceUrl = process.env.SUPPORT_BREAK_SOURCE_URL;
  private readonly usMarketRsiSourceUrl =
    process.env.US_MARKET_RSI_SOURCE_URL ??
    process.env.ALL_US_RSI_SOURCE_URL ??
    '';
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

  private async fetchExternalSupportBreakRows(): Promise<
    GoogleSupportBreakRow[] | null
  > {
    if (!this.supportBreakSourceUrl) {
      this.logger.error('Support-break dataset URL not configured');
      return null;
    }

    try {
      const response = await fetch(this.supportBreakSourceUrl);
      if (!response.ok) {
        this.logger.error(
          `Failed to fetch external support-break dataset (status=${response.status})`,
        );
        return null;
      }

      const payload = (await response.json()) as GoogleSupportBreakResponse;
      if (payload.error) {
        this.logger.error(
          'External support-break dataset reported an error flag',
        );
        return null;
      }

      if (!Array.isArray(payload.data) || !payload.data.length) {
        this.logger.warn('External support-break dataset returned no rows');
        return null;
      }

      return payload.data;
    } catch (error) {
      this.logger.error('Error fetching external support-break dataset', error);
      return null;
    }
  }

  private async fetchExternalUsMarketRsiRows(): Promise<
    GoogleUsMarketRsiRow[] | null
  > {
    if (!this.usMarketRsiSourceUrl) {
      this.logger.error('US market RSI dataset URL not configured');
      return null;
    }

    try {
      const response = await fetch(this.usMarketRsiSourceUrl);
      if (!response.ok) {
        this.logger.error(
          `Failed to fetch US market RSI dataset (status=${response.status})`,
        );
        return null;
      }

      const payload =
        (await response.json()) as GoogleUsMarketRsiResponse | null;

      if (!payload || payload.error) {
        this.logger.error('US market RSI dataset reported an error');
        return null;
      }

      if (!Array.isArray(payload.data) || !payload.data.length) {
        this.logger.warn('US market RSI dataset returned no rows');
        return null;
      }

      return payload.data;
    } catch (error) {
      this.logger.error('Error fetching US market RSI dataset', error);
      return null;
    }
  }

  private mapGoogleSupportBreakRow(
    row: GoogleSupportBreakRow,
  ): SupportBreakLoser | null {
    const symbol = this.asString(row.Ticker)?.trim().toUpperCase();
    if (!symbol || !this.symbolPattern.test(symbol)) {
      return null;
    }

    const parseValue = (value?: number | string): number | null => {
      if (typeof value === 'string' && !value.trim()) {
        return null;
      }
      return this.normalizeNumeric(value);
    };

    const price = parseValue(row.Price);
    if (price === null) {
      return null;
    }

    const changePercentRaw = parseValue(row['Change %']);
    const changePercent =
      changePercentRaw !== null && Number.isFinite(changePercentRaw)
        ? changePercentRaw
        : 0;

    const support1 = this.roundTo(parseValue(row['Support 1']));
    const support2 = this.roundTo(parseValue(row['Support 2']));
    const resistance1 = this.roundTo(parseValue(row['Resistance 1']));
    const resistance2 = this.roundTo(parseValue(row['Resistance 2']));
    const rsi = this.roundTo(parseValue(row.RSI));
    const ema50 = this.roundTo(parseValue(row['EMA 50']));
    const ema200 = this.roundTo(parseValue(row['EMA 200']));
    const companyName = this.asString(row['Company name'])?.trim() ?? null;
    const group = this.asString(row.Group)?.trim() ?? null;

    const changeValue = this.roundTo(
      price * (changePercent !== null ? changePercent / 100 : 0),
    );

    let belowSupportPercent: number | null = null;
    let distanceToSupportPercent: number | null = null;

    if (support1 !== null && support1 !== 0) {
      const deltaPercent = this.roundTo(((price - support1) / support1) * 100);
      if (deltaPercent !== null) {
        if (deltaPercent < 0) {
          belowSupportPercent = deltaPercent;
        } else {
          distanceToSupportPercent = deltaPercent;
        }
      }
    }

    return {
      symbol,
      companyName,
      lastPrice: price,
      changePercent,
      change: changeValue,
      volume: null,
      supportLevel: support1,
      supportLevelSecondary: support2,
      resistance1,
      resistance2,
      belowSupportPercent,
      distanceToSupportPercent,
      rsi,
      ema50,
      ema200,
      group,
    };
  }

  private mapGoogleUsMarketRsiRow(
    row: GoogleUsMarketRsiRow,
  ): USMarketRsiBucketStock | null {
    const symbol = this.asString(row.Ticker)?.trim().toUpperCase();
    if (!symbol || !this.symbolPattern.test(symbol)) {
      return null;
    }

    const rsi = this.roundTo(this.normalizeNumeric(row.RSI));
    if (rsi === null) {
      return null;
    }

    const status = this.classifyRsi(rsi);
    if (status === 'neutral') {
      return null;
    }

    const lastPrice = this.roundTo(this.normalizeNumeric(row.Price));
    const changePercent = this.roundTo(this.normalizeNumeric(row['Change %']));
    const change =
      changePercent !== null && lastPrice !== null
        ? this.roundTo(lastPrice * (changePercent / 100))
        : this.roundTo(this.normalizeNumeric(row.Change));
    const group = this.asString(row.Group)?.trim() ?? null;
    const companyName = this.asString(row['Company name'])?.trim() ?? null;
    const lastUpdatedRaw =
      this.asString(row['Last Updated']) ?? this.asString(row['Updated At']);
    const lastUpdated = lastUpdatedRaw ? new Date(lastUpdatedRaw) : null;

    return {
      symbol,
      rsi,
      status,
      lastPrice,
      changePercent,
      change,
      group,
      companyName,
      lastUpdated:
        lastUpdated && Number.isNaN(lastUpdated.getTime()) ? null : lastUpdated,
    };
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

  private mapResolutionToPolygon(resolution: PriceResolution): {
    multiplier: number;
    timespan: PolygonTimespan;
  } {
    switch (resolution) {
      case 'week':
        return { multiplier: 1, timespan: 'week' };
      case 'month':
        return { multiplier: 1, timespan: 'month' };
      default:
        return { multiplier: 1, timespan: 'day' };
    }
  }

  private async fetchPolygonAggregates(
    symbol: string,
    resolution: PriceResolution,
    from: number,
    to: number,
  ): Promise<StockPricePoint[] | null> {
    if (!this.polygonApiKey) {
      return null;
    }

    const upper = symbol.toUpperCase();
    const { multiplier, timespan } = this.mapResolutionToPolygon(resolution);
    const fromMs = Math.max(0, from * 1000);
    const toMs = Math.max(fromMs + 60_000, to * 1000);
    const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(upper)}/range/${multiplier}/${timespan}/${fromMs}/${toMs}?adjusted=true&sort=asc&limit=50000&apiKey=${this.polygonApiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(
          `Polygon aggregates request failed for ${upper}: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const payload = (await response.json()) as PolygonAggregatePayload;
      const results = Array.isArray(payload?.results) ? payload.results : [];

      if (!results.length) {
        this.logger.debug(`Polygon returned no aggregates for ${upper}`);
        return null;
      }

      const points: StockPricePoint[] = [];
      for (const item of results) {
        const close = item?.c;
        const timestamp = item?.t;
        if (typeof close !== 'number' || !Number.isFinite(close)) {
          continue;
        }
        if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
          continue;
        }
        const volume = item?.v;
        points.push({
          timestamp,
          date: new Date(timestamp).toISOString(),
          close: this.roundTo(close, 2) ?? close,
          volume:
            typeof volume === 'number' && Number.isFinite(volume)
              ? Math.round(volume)
              : null,
        });
      }

      points.sort((a, b) => a.timestamp - b.timestamp);
      return points;
    } catch (error) {
      this.logger.error(
        `Error fetching Polygon aggregates for ${upper}:`,
        error,
      );
      return null;
    }
  }

  private async fetchAlphaVantageSeries(
    symbol: string,
    resolution: PriceResolution,
    from: number,
    to: number,
  ): Promise<StockPricePoint[] | null> {
    if (!this.alphaVantageApiKey) {
      return null;
    }

    const upper = symbol.toUpperCase();
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(upper)}&outputsize=full&apikey=${this.alphaVantageApiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(
          `Alpha Vantage daily series request failed for ${upper}: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const payload = (await response.json()) as Record<string, unknown>;
      if (typeof payload['Error Message'] === 'string') {
        this.logger.warn(
          `Alpha Vantage returned error for ${upper}: ${payload['Error Message']}`,
        );
        return null;
      }
      if (typeof payload['Note'] === 'string') {
        this.logger.warn(
          `Alpha Vantage throttle notice for ${upper}: ${payload['Note']}`,
        );
        return null;
      }

      const seriesKey = Object.keys(payload).find((key) =>
        key.toLowerCase().includes('time series'),
      );
      if (!seriesKey) {
        this.logger.debug(
          `Alpha Vantage payload missing time series for ${upper}`,
        );
        return null;
      }

      const series = payload[seriesKey];
      if (!series || typeof series !== 'object') {
        this.logger.debug(`Alpha Vantage time series invalid for ${upper}`);
        return null;
      }

      const fromMs = from * 1000;
      const toMs = to * 1000;

      const points: StockPricePoint[] = [];
      for (const [date, values] of Object.entries(
        series as AlphaVantageDailySeries,
      )) {
        const closeRaw = values['5. adjusted close'] ?? values['4. close'];
        const volumeRaw = values['6. volume'];
        const closeValue = this.parseNumericString(closeRaw ?? '') ?? null;
        if (closeValue === null) {
          continue;
        }
        const timestamp = Date.parse(`${date}T00:00:00Z`);
        if (!Number.isFinite(timestamp)) {
          continue;
        }
        if (timestamp < fromMs || timestamp > toMs) {
          continue;
        }
        const volumeValue = this.parseNumericString(volumeRaw ?? '');
        points.push({
          timestamp,
          date: new Date(timestamp).toISOString(),
          close: this.roundTo(closeValue, 2) ?? closeValue,
          volume: volumeValue !== null ? Math.round(volumeValue) : null,
        });
      }

      points.sort((a, b) => a.timestamp - b.timestamp);

      if (!points.length) {
        this.logger.debug(
          `Alpha Vantage returned no points within range for ${upper}`,
        );
        return null;
      }

      if (resolution === 'day') {
        return points;
      }

      return this.aggregateSeries(points, resolution);
    } catch (error) {
      this.logger.error(
        `Error fetching Alpha Vantage daily series for ${upper}:`,
        error,
      );
      return null;
    }
  }

  private aggregateSeries(
    points: StockPricePoint[],
    resolution: PriceResolution,
  ): StockPricePoint[] {
    if (resolution === 'day' || !points.length) {
      return points;
    }

    const buckets = new Map<
      number,
      {
        timestamp: number;
        close: number;
        volume: number;
      }
    >();

    for (const point of points) {
      const bucketStart =
        resolution === 'week'
          ? this.getWeekStart(point.timestamp)
          : this.getMonthStart(point.timestamp);
      const existing = buckets.get(bucketStart);
      const pointVolume = typeof point.volume === 'number' ? point.volume : 0;
      if (!existing) {
        buckets.set(bucketStart, {
          timestamp: point.timestamp,
          close: point.close,
          volume: pointVolume,
        });
        continue;
      }

      if (point.timestamp >= existing.timestamp) {
        existing.timestamp = point.timestamp;
        existing.close = point.close;
      }

      existing.volume += pointVolume;
    }

    return Array.from(buckets.entries())
      .map(([, data]) => ({
        timestamp: data.timestamp,
        date: new Date(data.timestamp).toISOString(),
        close: this.roundTo(data.close, 2) ?? data.close,
        volume: Number.isFinite(data.volume) ? Math.round(data.volume) : null,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  private getWeekStart(timestamp: number): number {
    const date = new Date(timestamp);
    const day = date.getUTCDay();
    const diff = (day + 6) % 7; // convert so Monday is start of week
    const start = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
    return start - diff * 86400 * 1000;
  }

  private getMonthStart(timestamp: number): number {
    const date = new Date(timestamp);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  }

  private async fetchPriceSeries(
    symbol: string,
    resolution: PriceResolution,
    from: number,
    to: number,
  ): Promise<{
    provider: 'polygon' | 'alphaVantage' | null;
    points: StockPricePoint[];
    message?: string;
  }> {
    let message: string | undefined;

    if (this.polygonApiKey) {
      const polygonPoints = await this.fetchPolygonAggregates(
        symbol,
        resolution,
        from,
        to,
      );
      if (polygonPoints && polygonPoints.length) {
        return { provider: 'polygon', points: polygonPoints };
      }
      message = 'Polygon aggregates unavailable for requested range';
    }

    if (this.alphaVantageApiKey) {
      const alphaPoints = await this.fetchAlphaVantageSeries(
        symbol,
        resolution,
        from,
        to,
      );
      if (alphaPoints && alphaPoints.length) {
        return {
          provider: 'alphaVantage',
          points: alphaPoints,
          message,
        };
      }
      message = message
        ? `${message}; Alpha Vantage returned no data`
        : 'Alpha Vantage returned no data';
    }

    if (!this.polygonApiKey && !this.alphaVantageApiKey) {
      message = 'No Polygon or Alpha Vantage API key configured';
    }

    return { provider: null, points: [], message };
  }

  private quantile(sorted: number[], q: number): number | null {
    if (!sorted.length) {
      return null;
    }
    if (q <= 0) {
      return sorted[0];
    }
    if (q >= 1) {
      return sorted[sorted.length - 1];
    }

    const position = (sorted.length - 1) * q;
    const base = Math.floor(position);
    const rest = position - base;
    const lower = sorted[base];
    const upper = sorted[base + 1] ?? lower;
    return lower + rest * (upper - lower);
  }

  private buildSupportSnapshot(
    points: StockPricePoint[],
    currentPrice?: number | null,
  ): SupportLevelsSnapshot | null {
    const closes = points
      .map((point) => point.close)
      .filter((value) => typeof value === 'number' && Number.isFinite(value));

    if (!closes.length) {
      return null;
    }

    const sorted = [...closes].sort((a, b) => a - b);
    const latest =
      typeof currentPrice === 'number' && Number.isFinite(currentPrice)
        ? currentPrice
        : (points[points.length - 1]?.close ?? null);

    const supportPrimary = this.quantile(sorted, sorted.length > 1 ? 0.2 : 0);
    const supportSecondary = this.quantile(
      sorted,
      sorted.length > 2 ? 0.35 : 0,
    );
    const resistancePrimary = this.quantile(
      sorted,
      sorted.length > 1 ? 0.65 : 1,
    );
    const resistanceSecondary = this.quantile(
      sorted,
      sorted.length > 2 ? 0.85 : 1,
    );

    const belowSupportPercent =
      supportPrimary !== null && supportPrimary !== 0 && latest !== null
        ? ((latest - supportPrimary) / supportPrimary) * 100
        : null;

    return {
      supportLevel:
        supportPrimary !== null ? this.roundTo(supportPrimary, 2) : null,
      supportLevelSecondary:
        supportSecondary !== null ? this.roundTo(supportSecondary, 2) : null,
      resistance1:
        resistancePrimary !== null ? this.roundTo(resistancePrimary, 2) : null,
      resistance2:
        resistanceSecondary !== null
          ? this.roundTo(resistanceSecondary, 2)
          : null,
      belowSupportPercent:
        belowSupportPercent !== null
          ? this.roundTo(belowSupportPercent, 2)
          : null,
      distanceToSupportPercent:
        belowSupportPercent !== null
          ? this.roundTo(Math.abs(belowSupportPercent), 2)
          : null,
    } satisfies SupportLevelsSnapshot;
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
    resolution: PriceResolution;
  } {
    const nowSeconds = Math.floor(Date.now() / 1000);
    switch (range) {
      case '1M':
        return { from: nowSeconds - 30 * 86400, resolution: 'day' };
      case '3M':
        return { from: nowSeconds - 90 * 86400, resolution: 'day' };
      case '6M':
        return { from: nowSeconds - 180 * 86400, resolution: 'day' };
      case '1Y':
        return { from: nowSeconds - 365 * 86400, resolution: 'day' };
      case 'YTD': {
        const now = new Date();
        const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0);
        return {
          from: Math.floor(startOfYear / 1000),
          resolution: 'day',
        };
      }
      default:
        return { from: nowSeconds - 180 * 86400, resolution: 'day' };
    }
  }

  private getPerformanceWindowStart(): number {
    // Fetch a little over one full year to support all timeframes reliably.
    return Math.floor(Date.now() / 1000) - 400 * 86400;
  }

  private getSupportLookbackSeconds(resolution: PriceResolution): number {
    switch (resolution) {
      case 'week':
        return 3 * 365 * 86400; // approx 3 years
      case 'month':
        return 5 * 365 * 86400; // approx 5 years
      default:
        return 180 * 86400; // 6 months for daily data
    }
  }

  private async computeSupportSnapshot(
    symbol: string,
    resolution: PriceResolution,
    currentPrice?: number | null,
  ): Promise<{
    snapshot: SupportLevelsSnapshot | null;
    provider: 'polygon' | 'alphaVantage' | null;
    message?: string;
  }> {
    const now = Math.floor(Date.now() / 1000);
    const from = now - this.getSupportLookbackSeconds(resolution);
    const history = await this.fetchPriceSeries(symbol, resolution, from, now);
    const snapshot = history.points.length
      ? this.buildSupportSnapshot(history.points, currentPrice)
      : null;
    return {
      snapshot,
      provider: history.provider,
      message: history.message,
    };
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
      supportResolution?: PriceResolution;
    },
  ): Promise<StockOverviewResponse> {
    const upper = symbol.toUpperCase();
    const includeRsi = options?.includeRsi ?? false;
    const supportResolution = options?.supportResolution ?? 'day';

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
    let supportProvider: 'polygon' | 'alphaVantage' | null = null;
    if (priceSnapshot && priceSnapshot.price !== null) {
      const supportResult = await this.computeSupportSnapshot(
        upper,
        supportResolution,
        priceSnapshot.price,
      );
      support = supportResult.snapshot;
      supportProvider = supportResult.provider;
      supportMessage = supportResult.message;
      if (!support && !supportMessage) {
        supportMessage = 'Support levels unavailable for requested resolution';
      }
    } else {
      supportMessage =
        'Support levels unavailable without a valid price snapshot';
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
        supportProvider,
        includeRsi,
        timestamp: new Date(),
        message: supportMessage,
      },
    };
  }

  async getStockPriceHistory(
    symbol: string,
    range: StockPriceHistoryRange = '6M',
    supportResolution: PriceResolution = 'day',
  ): Promise<StockPriceHistoryResponse> {
    const upper = symbol.toUpperCase();
    const basics = await this.stockMetadataService
      .getCompanyBasics(upper)
      .catch(() => null);
    const { from, resolution } = this.resolveHistoryRange(range);
    const to = Math.floor(Date.now() / 1000);

    const disabled = !this.polygonApiKey && !this.alphaVantageApiKey;
    const history = await this.fetchPriceSeries(upper, resolution, from, to);

    const response: StockPriceHistoryResponse = {
      symbol: upper,
      companyName: basics?.name ?? null,
      range,
      resolution,
      provider: history.provider,
      points: history.points,
      metadata: {
        from,
        to,
        count: history.points.length,
        disabled,
        message: history.message,
      },
    };

    if (history.points.length) {
      const latestClose = history.points[history.points.length - 1]?.close;
      const supportResult = await this.computeSupportSnapshot(
        upper,
        supportResolution,
        latestClose,
      );
      response.support = supportResult.snapshot;
      if (supportResult.message) {
        response.metadata.message = response.metadata.message
          ? `${response.metadata.message}; ${supportResult.message}`
          : supportResult.message;
      }
    }

    if (!response.metadata.message && disabled) {
      response.metadata.message =
        'No Polygon or Alpha Vantage API key configured for price history';
    }

    return response;
  }

  async getStockPerformance(symbol: string): Promise<StockPerformanceResponse> {
    const upper = symbol.toUpperCase();
    const basics = await this.stockMetadataService
      .getCompanyBasics(upper)
      .catch(() => null);
    const from = this.getPerformanceWindowStart();
    const to = Math.floor(Date.now() / 1000);

    const disabled = !this.polygonApiKey && !this.alphaVantageApiKey;
    const history = await this.fetchPriceSeries(upper, 'day', from, to);

    const response: StockPerformanceResponse = {
      symbol: upper,
      companyName: basics?.name ?? null,
      entries: [],
      latestClose: null,
      metadata: {
        provider: history.provider,
        from,
        to,
        count: history.points.length,
        disabled,
        message: history.message,
      },
    };

    if (!history.points.length) {
      if (!response.metadata.message && disabled) {
        response.metadata.message =
          'No Polygon or Alpha Vantage price data available for performance';
      }
      return response;
    }

    response.latestClose = history.points[history.points.length - 1].close;
    response.entries = this.buildPerformanceEntries(history.points);
    return response;
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
    const hasPolygonKey = !!this.polygonApiKey;
    const metadata = {
      provider: hasFmpKey ? ('fmp' as const) : ('polygon' as const),
      limit,
      hasApiKey: hasFmpKey || hasPolygonKey,
      fetchedAt: new Date(),
      message: undefined as string | undefined,
    };

    if (!hasFmpKey && !hasPolygonKey) {
      metadata.message =
        'No news providers configured; set FMP_API_KEY or POLYGON_API_KEY';
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

    if (hasPolygonKey) {
      const url = `https://api.polygon.io/v2/reference/news?ticker=${encodeURIComponent(upper)}&order=desc&limit=${limit}&apiKey=${this.polygonApiKey}`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          const payload = (await response.json()) as PolygonNewsPayload;
          const items = (payload.results ?? []).slice(0, limit).map((item) => ({
            headline: item.title ?? 'Unknown headline',
            source: item.publisher?.name ?? null,
            url: item.article_url ?? null,
            summary: item.description ?? null,
            publishedAt: item.published_utc ?? null,
            imageUrl: item.image_url ?? null,
          }));

          metadata.provider = 'polygon';
          if (!items.length) {
            metadata.message = 'Polygon returned no news results';
          }

          return {
            symbol: upper,
            items,
            metadata,
          };
        }
        metadata.message = `Polygon news request failed with status ${response.status}`;
      } catch (error) {
        metadata.message = `Error fetching Polygon news: ${
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
    resolution = 'day',
  }: {
    limit?: number;
    tolerancePercent?: number;
    minDropPercent?: number;
    resolution?: PriceResolution;
  } = {}): Promise<SupportBreakLosersResponse | null> {
    const normalizedLimit = Math.max(1, limit);
    const normalizedTolerance = tolerancePercent >= 0 ? tolerancePercent : 1;
    const normalizedDrop = minDropPercent >= 0 ? minDropPercent : 0;
    const normalizedResolution: PriceResolution = resolution ?? 'day';

    this.logger.debug(
      `Fetching external support-break dataset (limit=${normalizedLimit})`,
    );

    const rows = await this.fetchExternalSupportBreakRows();
    if (!rows) {
      return null;
    }

    console.log({ rows });

    const transformed = rows
      .map((row) => this.mapGoogleSupportBreakRow(row))
      .filter(
        (row): row is SupportBreakLoser =>
          row !== null &&
          row.supportLevel !== null &&
          row.lastPrice < (row.supportLevel || 0),
      )
      .sort((a, b) => {
        const dropA = a.belowSupportPercent ?? 0;
        const dropB = b.belowSupportPercent ?? 0;
        return dropA - dropB;
      });

    if (!transformed.length) {
      this.logger.warn(
        'External support-break dataset did not contain any valid rows',
      );
      return null;
    }

    const limited = transformed.slice(0, normalizedLimit);

    return {
      timestamp: new Date(),
      stocks: limited,
      metadata: {
        limitRequested: normalizedLimit,
        inspected: rows.length,
        produced: limited.length,
        tolerancePercent: normalizedTolerance,
        minDropPercent: normalizedDrop,
        resolution: normalizedResolution,
        skippedSymbols: [],
      },
    };
  }

  async getUSMarketRsi({
    limitPerBucket = 25,
  }: {
    limitPerBucket?: number;
  } = {}): Promise<USMarketRsiBucketResponse | null> {
    const rows = await this.fetchExternalUsMarketRsiRows();
    if (!rows) {
      return null;
    }

    const limit = Math.max(1, limitPerBucket);
    const oversold: USMarketRsiBucketStock[] = [];
    const overbought: USMarketRsiBucketStock[] = [];
    let produced = 0;
    let oversoldCount = 0;
    let overboughtCount = 0;

    for (const row of rows) {
      const mapped = this.mapGoogleUsMarketRsiRow(row);
      if (!mapped) {
        continue;
      }

      produced += 1;

      if (mapped.status === 'oversold') {
        oversoldCount += 1;
        if (oversold.length < limit) {
          oversold.push(mapped);
        }
      } else if (mapped.status === 'overbought') {
        overboughtCount += 1;
        if (overbought.length < limit) {
          overbought.push(mapped);
        }
      }
    }

    if (!oversold.length && !overbought.length) {
      this.logger.warn(
        'External US market RSI dataset contained no oversold or overbought entries',
      );
      return null;
    }

    this.logger.debug(
      `US market RSI dataset processed (oversold=${oversoldCount}, overbought=${overboughtCount}, limit=${limit})`,
    );

    return {
      timestamp: new Date(),
      oversold: oversold.sort((stockA, stockB) => stockA.rsi - stockB.rsi),
      overbought: overbought.sort((stockA, stockB) => stockB.rsi - stockA.rsi),
      metadata: {
        limitPerBucket: limit,
        inspected: rows.length,
        produced,
        oversoldCount,
        overboughtCount,
        source: 'google-script',
        // sourceUrl: this.usMarketRsiSourceUrl || null,
      },
    };
  }
}
