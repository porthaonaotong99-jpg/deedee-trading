import { Injectable, Logger } from '@nestjs/common';

export interface ExternalQuote {
  symbol: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  volume?: number;
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  provider: string;
  timestamp: Date;
}

export type MarketDataProvider =
  | 'alphaVantage'
  | 'polygon'
  | 'iex'
  | 'yahoo'
  | 'finnhub'
  | 'fmp';

interface ProviderConfig {
  apiKey?: string;
  enabled: boolean;
}

interface PriceFetcherOptions {
  alphaVantage: ProviderConfig;
  polygon: ProviderConfig;
  iex: ProviderConfig;
  yahoo: ProviderConfig; // does not need api key for basic quote via rapid fallback or unofficial
  finnhub: ProviderConfig;
  fmp: ProviderConfig;
  primary: MarketDataProvider;
  fallbackOrder: MarketDataProvider[];
}

// ---------------------- Provider Response Types & Type Guards ---------------------- //

// Alpha Vantage
interface AlphaVantageGlobalQuoteRaw {
  '01. symbol'?: string;
  '02. open'?: string;
  '03. high'?: string;
  '04. low'?: string;
  '05. price'?: string;
  '06. volume'?: string;
  '07. latest trading day'?: string;
  '08. previous close'?: string;
  '09. change'?: string;
  '10. change percent'?: string;
  [k: string]: string | undefined;
}
interface AlphaVantageResponseShape {
  'Global Quote'?: AlphaVantageGlobalQuoteRaw;
  [k: string]: unknown;
}
function isAlphaVantageResponse(v: unknown): v is AlphaVantageResponseShape {
  if (!v || typeof v !== 'object') return false;
  if (!('Global Quote' in v)) return false;
  const gq = (v as Record<string, unknown>)['Global Quote'];
  return !gq || typeof gq === 'object';
}

// Polygon NBBO response
interface PolygonNBBOResultRaw {
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  p?: number; // price fallback
  t?: number; // timestamp
  [k: string]: unknown;
}
interface PolygonNBBOResponseShape {
  results?: PolygonNBBOResultRaw;
  [k: string]: unknown;
}
function isPolygonNBBOResponse(v: unknown): v is PolygonNBBOResponseShape {
  return !!v && typeof v === 'object';
}

// IEX Quote response (simplified subset)
interface IEXQuoteResponseShape {
  symbol?: string;
  latestPrice?: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  latestVolume?: number;
  volume?: number;
  iexBidPrice?: number;
  iexAskPrice?: number;
  iexBidSize?: number;
  iexAskSize?: number;
  latestUpdate?: number;
  [k: string]: unknown;
}
function isIEXQuote(v: unknown): v is IEXQuoteResponseShape {
  return !!v && typeof v === 'object' && 'latestPrice' in v;
}

// Yahoo Finance response
interface YahooQuoteRaw {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketPreviousClose?: number;
  regularMarketVolume?: number;
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  regularMarketTime?: number;
  [k: string]: unknown;
}
interface YahooQuoteResponseShape {
  quoteResponse?: { result?: YahooQuoteRaw[] };
  [k: string]: unknown;
}
function isYahooResponse(v: unknown): v is YahooQuoteResponseShape {
  if (!v || typeof v !== 'object') return false;
  if (!('quoteResponse' in v)) return false;
  const qr = (v as Record<string, unknown>).quoteResponse;
  if (!qr || typeof qr !== 'object') return false;
  const result = (qr as { result?: unknown }).result;
  return !result || Array.isArray(result);
}

// Financial Modeling Prep (FMP) response
interface FMPQuoteResponseShape {
  symbol?: string;
  price?: number;
  changesPercentage?: number;
  change?: number;
  dayLow?: number;
  dayHigh?: number;
  yearHigh?: number;
  yearLow?: number;
  marketCap?: number;
  priceAvg50?: number;
  priceAvg200?: number;
  volume?: number;
  avgVolume?: number;
  exchange?: string;
  open?: number;
  previousClose?: number;
  eps?: number;
  pe?: number;
  earningsAnnouncement?: string;
  sharesOutstanding?: number;
  timestamp?: number;
  [k: string]: unknown;
}
function isFMPQuote(v: unknown): v is FMPQuoteResponseShape {
  return !!v && typeof v === 'object' && 'price' in v && 'symbol' in v;
}

// Utility
function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * ExternalPriceFetcherService
 * Lightweight abstraction over multiple quote providers.
 * Currently implements minimal quote endpoints; each method returns a unified ExternalQuote.
 * NOTE: Real provider integrations require proper SDKs, rate limit handling, and error classification.
 */
@Injectable()
export class ExternalPriceFetcherService {
  private readonly logger = new Logger(ExternalPriceFetcherService.name);
  private readonly primary: MarketDataProvider;
  private readonly fallback: MarketDataProvider[];
  private readonly finnhubVolumeCache = new Map<
    string,
    { volume?: number; ts: number }
  >();
  private readonly FINNHUB_FETCH_VOLUME =
    (process.env.FINNHUB_FETCH_VOLUME || 'true') === 'true';
  private readonly FINNHUB_VOLUME_TTL_MS = 60_000; // 1 minute cache

  constructor() {
    // In a real implementation, inject ConfigService and populate from env.
    const opts: PriceFetcherOptions = {
      alphaVantage: {
        apiKey: process.env.ALPHA_VANTAGE_KEY,
        enabled: !!process.env.ALPHA_VANTAGE_KEY,
      },
      polygon: {
        apiKey: process.env.POLYGON_API_KEY,
        enabled: !!process.env.POLYGON_API_KEY,
      },
      iex: {
        apiKey: process.env.IEX_CLOUD_KEY,
        enabled: !!process.env.IEX_CLOUD_KEY,
      },
      finnhub: {
        apiKey: process.env.FINNHUB_KEY,
        enabled: !!process.env.FINNHUB_KEY,
      },
      fmp: {
        apiKey: process.env.FMP_API_KEY,
        enabled: !!process.env.FMP_API_KEY,
      },
      yahoo: { enabled: true },
      primary:
        (process.env.MARKET_DATA_PRIMARY as MarketDataProvider) || 'yahoo',
      fallbackOrder: [
        'fmp',
        'finnhub',
        'alphaVantage',
        'polygon',
        'iex',
        'yahoo',
      ],
    };

    this.primary = opts.primary;
    this.fallback = opts.fallbackOrder.filter((p) => p !== this.primary);

    // Log the configuration for debugging
    this.logger.log(`Market Data Configuration:`);
    this.logger.log(`  Primary Provider: ${this.primary}`);
    this.logger.log(`  Fallback Order: [${this.fallback.join(', ')}]`);
    this.logger.log(
      `  AlphaVantage: ${opts.alphaVantage.enabled ? 'ENABLED' : 'DISABLED'} (key: ${opts.alphaVantage.apiKey ? 'SET' : 'NOT SET'})`,
    );
    this.logger.log(
      `  Polygon: ${opts.polygon.enabled ? 'ENABLED' : 'DISABLED'} (key: ${opts.polygon.apiKey ? 'SET' : 'NOT SET'})`,
    );
    this.logger.log(
      `  Finnhub: ${opts.finnhub.enabled ? 'ENABLED' : 'DISABLED'} (key: ${opts.finnhub.apiKey ? 'SET' : 'NOT SET'})`,
    );
    this.logger.log(
      `  FMP: ${opts.fmp.enabled ? 'ENABLED' : 'DISABLED'} (key: ${opts.fmp.apiKey ? 'SET' : 'NOT SET'})`,
    );
    this.logger.log(
      `  IEX: ${opts.iex.enabled ? 'ENABLED' : 'DISABLED'} (key: ${opts.iex.apiKey ? 'SET' : 'NOT SET'})`,
    );
    this.logger.log(
      `  Yahoo: ${opts.yahoo.enabled ? 'ENABLED' : 'DISABLED'} (no key required)`,
    );
  }

  async fetchQuote(symbol: string): Promise<ExternalQuote | null> {
    const pipeline: MarketDataProvider[] = [this.primary, ...this.fallback];
    this.logger.debug(
      `[${symbol}] Trying providers in order: [${pipeline.join(', ')}]`,
    );

    for (const provider of pipeline) {
      try {
        this.logger.debug(`[${symbol}] Trying provider: ${provider}`);
        const quote = await this.fetchFromProvider(provider, symbol);
        console.log({ quote });
        if (quote) {
          this.logger.debug(
            `[${symbol}] SUCCESS from ${provider}: $${quote.price}`,
          );
          return quote;
        } else {
          this.logger.debug(`[${symbol}] No data from provider: ${provider}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`[${symbol}] Provider ${provider} failed: ${message}`);
      }
    }

    this.logger.error(
      `[${symbol}] ALL providers failed. Pipeline was: [${pipeline.join(', ')}]`,
    );
    return null;
  }

  /**
   * Lightweight existence validation for a symbol without committing to full insertion logic.
   * Returns true if at least one provider responds with a plausible quote structure.
   * Intentionally shallow: avoids creating DB rows for arbitrary user input.
   */
  async validateSymbolExists(symbol: string): Promise<boolean> {
    const upper = symbol.toUpperCase();
    // Try a very quick Yahoo probe first (no key required)
    try {
      const yahoo = await this.fetchYahoo(upper);
      if (yahoo && yahoo.price != null) return true;
    } catch {
      /* ignore */
    }
    // Try FMP if key present - generally fast and reliable
    if (process.env.FMP_API_KEY) {
      try {
        const fmp = await this.fetchFMP(upper);
        if (fmp && fmp.price != null) return true;
      } catch {
        /* ignore */
      }
    }
    // Optionally probe Finnhub if key present
    if (process.env.FINNHUB_KEY) {
      try {
        const finnhub = await this.fetchFinnhub(upper);
        if (finnhub && finnhub.price != null) return true;
      } catch {
        /* ignore */
      }
    }
    return false;
  }

  private async fetchFromProvider(
    provider: MarketDataProvider,
    symbol: string,
  ): Promise<ExternalQuote | null> {
    switch (provider) {
      case 'alphaVantage':
        return this.fetchAlphaVantage(symbol);
      case 'polygon':
        return this.fetchPolygon(symbol);
      case 'iex':
        return this.fetchIEX(symbol);
      case 'finnhub':
        return this.fetchFinnhub(symbol);
      case 'fmp':
        return this.fetchFMP(symbol);
      case 'yahoo':
      default:
        return this.fetchYahoo(symbol);
    }
  }

  // Minimal Alpha Vantage global quote implementation
  private async fetchAlphaVantage(
    symbol: string,
  ): Promise<ExternalQuote | null> {
    if (!process.env.ALPHA_VANTAGE_KEY) return null;
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
      symbol,
    )}&apikey=${process.env.ALPHA_VANTAGE_KEY}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      return null;
    }
    if (!res.ok) return null;
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return null;
    }
    if (!isAlphaVantageResponse(json) || !json['Global Quote']) return null;
    const raw = json['Global Quote'];
    const price = toNumber(raw['05. price']);
    if (Number.isNaN(price)) return null;
    const vol = toNumber(raw['06. volume']);
    return {
      symbol: raw['01. symbol'] || symbol,
      price: price!,
      open: toNumber(raw['02. open']),
      high: toNumber(raw['03. high']),
      low: toNumber(raw['04. low']),
      previousClose: toNumber(raw['08. previous close']),
      volume: vol,
      provider: 'alphaVantage',
      timestamp: new Date(),
    };
  }

  // Finnhub simple quote
  private async fetchFinnhub(symbol: string): Promise<ExternalQuote | null> {
    if (!process.env.FINNHUB_KEY) return null;
    // Use the /quote endpoint for current price snapshot. The previously used /stock/tick
    // endpoint requires different params and higher plan access; it caused 403 responses.
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
      symbol,
    )}&token=${process.env.FINNHUB_KEY}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      return null;
    }
    console.log({ res });
    if (!res.ok) {
      if (res.status === 403) {
        this.logger.debug(
          `Finnhub 403 for ${symbol} – likely invalid/expired key, free plan limit, or disallowed endpoint usage. URL: ${url}`,
        );
      }
      return null;
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return null;
    }
    if (!json || typeof json !== 'object') return null;
    const obj = json as Record<string, unknown>;
    const current = toNumber(obj.c);
    if (typeof current !== 'number') return null;
    // Finnhub /quote may include today's cumulative volume in field 'v'. Use it as a baseline.
    let volume: number | undefined = toNumber(obj.v);

    if (this.FINNHUB_FETCH_VOLUME) {
      const cached = this.finnhubVolumeCache.get(symbol);
      const now = Date.now();
      if (cached && now - cached.ts < this.FINNHUB_VOLUME_TTL_MS) {
        volume = cached.volume;
      } else {
        let obtained = false;
        try {
          const todayStart = Math.floor(
            new Date(
              new Date().toISOString().substring(0, 10) + 'T00:00:00Z',
            ).getTime() / 1000,
          );
          const nowSec = Math.floor(now / 1000);
          const candleUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(
            symbol,
          )}&resolution=1&from=${todayStart}&to=${nowSec}&token=${process.env.FINNHUB_KEY}`;
          const candleRes = await fetch(candleUrl);
          if (candleRes.ok) {
            interface FinnhubCandleResponse {
              s?: string;
              v?: number[];
            }
            const candleJson = (await candleRes.json()) as unknown;
            const candle = candleJson as FinnhubCandleResponse;
            if (candle && candle.s === 'ok' && Array.isArray(candle.v)) {
              const sumVol = candle.v.reduce(
                (acc: number, v: number) =>
                  typeof v === 'number' ? acc + v : acc,
                0,
              );
              if (Number.isFinite(sumVol) && sumVol > 0) {
                volume = sumVol;
                obtained = true;
                this.finnhubVolumeCache.set(symbol, { volume, ts: now });
              }
            } else {
              this.logger.debug(
                `Finnhub intraday candle status for ${symbol}: ${candle?.s} url=${candleUrl.replace(/token=[^&]+/, 'token=***')}`,
              );
            }
          } else {
            this.logger.debug(
              `Finnhub intraday candle HTTP ${candleRes.status} for ${symbol} url=${candleUrl.replace(/token=[^&]+/, 'token=***')}`,
            );
          }
        } catch (e) {
          this.logger.debug(
            `Finnhub intraday volume fetch failed for ${symbol}: ${
              e instanceof Error ? e.message : e
            }`,
          );
        }
        // Fallback: daily candle (resolution=D) if we did not obtain a volume
        if (!obtained) {
          try {
            const dayFrom = Math.floor(Date.now() / 1000) - 86400 * 5; // last 5 days window
            const dayTo = Math.floor(Date.now() / 1000);
            const dayUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(
              symbol,
            )}&resolution=D&from=${dayFrom}&to=${dayTo}&token=${process.env.FINNHUB_KEY}`;
            const dayRes = await fetch(dayUrl);
            if (dayRes.ok) {
              interface FinnhubDailyCandleResponse {
                s?: string;
                v?: number[];
              }
              // Fetch and parse daily candles (multi-line to satisfy formatting rules)
              const dayJsonRaw: unknown = await dayRes.json();
              const dayJson = dayJsonRaw as FinnhubDailyCandleResponse;

              if (
                dayJson &&
                dayJson.s === 'ok' &&
                Array.isArray(dayJson.v) &&
                dayJson.v.length
              ) {
                const latest = dayJson.v[dayJson.v.length - 1];
                if (typeof latest === 'number' && latest > 0) {
                  volume = latest;
                  this.finnhubVolumeCache.set(symbol, {
                    volume,
                    ts: Date.now(),
                  });
                  obtained = true;
                }
              } else {
                this.logger.debug(
                  `Finnhub daily candle status for ${symbol}: ${dayJson?.s} url=${dayUrl.replace(/token=[^&]+/, 'token=***')}`,
                );
              }
            } else {
              this.logger.debug(
                `Finnhub daily candle HTTP ${dayRes.status} for ${symbol} url=${dayUrl.replace(/token=[^&]+/, 'token=***')}`,
              );
            }
          } catch (e) {
            this.logger.debug(
              `Finnhub daily volume fallback failed for ${symbol}: ${
                e instanceof Error ? e.message : e
              }`,
            );
          }
        }
        if (!obtained) {
          this.logger.debug(
            `Finnhub volume unavailable after intraday+daily attempts for ${symbol}`,
          );
        }
      }
    }

    // Cross-provider volume fallback (does not override price): try Yahoo then Alpha Vantage.
    if (volume == null) {
      try {
        const yahooQuote = await this.fetchYahoo(symbol);
        if (yahooQuote?.volume && yahooQuote.volume > 0) {
          volume = yahooQuote.volume;
          this.logger.debug(
            `Volume fallback from Yahoo for ${symbol}: ${yahooQuote.volume}`,
          );
        }
      } catch (e) {
        this.logger.debug(
          `Yahoo volume fallback error for ${symbol}: ${
            e instanceof Error ? e.message : e
          }`,
        );
      }
    }
    if (volume == null) {
      try {
        const avQuote = await this.fetchAlphaVantage(symbol);
        if (avQuote?.volume && avQuote.volume > 0) {
          volume = avQuote.volume;
          this.logger.debug(
            `Volume fallback from AlphaVantage for ${symbol}: ${avQuote.volume}`,
          );
        }
      } catch (e) {
        this.logger.debug(
          `AlphaVantage volume fallback error for ${symbol}: ${
            e instanceof Error ? e.message : e
          }`,
        );
      }
    }

    return {
      symbol: symbol.toUpperCase(),
      price: current,
      open: toNumber(obj.o),
      high: toNumber(obj.h),
      low: toNumber(obj.l),
      previousClose: toNumber(obj.pc),
      volume,
      provider: 'finnhub',
      timestamp: new Date(
        typeof obj.t === 'number' ? obj.t * 1000 : Date.now(),
      ),
    };
  }

  // Polygon.io last quote endpoint
  private async fetchPolygon(symbol: string): Promise<ExternalQuote | null> {
    if (!process.env.POLYGON_API_KEY) return null;
    const url = `https://api.polygon.io/v2/last/nbbo/${encodeURIComponent(
      symbol,
    )}?apiKey=${process.env.POLYGON_API_KEY}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      return null;
    }
    console.log({ res });
    if (!res.ok) return null;
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return null;
    }
    if (!isPolygonNBBOResponse(json)) return null;
    const r = json.results;
    if (!r) return null;
    const price = toNumber(r.bid ?? r.ask ?? r.p);
    if (!price && price !== 0) return null;
    return {
      symbol: symbol.toUpperCase(),
      price: price,
      bid: toNumber(r.bid),
      ask: toNumber(r.ask),
      bidSize: toNumber(r.bidSize),
      askSize: toNumber(r.askSize),
      provider: 'polygon',
      timestamp: new Date(toNumber(r.t) || Date.now()),
    };
  }

  // IEX Cloud simplified (sandbox/standard) - placeholder path
  private async fetchIEX(symbol: string): Promise<ExternalQuote | null> {
    if (!process.env.IEX_CLOUD_KEY) return null;
    const token = process.env.IEX_CLOUD_KEY;
    const base =
      process.env.IEX_CLOUD_BASE_URL || 'https://cloud.iexapis.com/stable';
    const url = `${base}/stock/${encodeURIComponent(symbol)}/quote?token=${token}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      return null;
    }
    if (!res.ok) return null;
    let q: unknown;
    try {
      q = await res.json();
    } catch {
      return null;
    }
    if (!isIEXQuote(q) || typeof q.latestPrice !== 'number') return null;
    const latestPrice = q.latestPrice;
    return {
      symbol: q.symbol || symbol,
      price: latestPrice,
      open: toNumber(q.open),
      high: toNumber(q.high),
      low: toNumber(q.low),
      previousClose: toNumber(q.previousClose),
      volume: toNumber(q.latestVolume ?? q.volume),
      bid: toNumber(q.iexBidPrice),
      ask: toNumber(q.iexAskPrice),
      bidSize: toNumber(q.iexBidSize),
      askSize: toNumber(q.iexAskSize),
      provider: 'iex',
      timestamp: new Date(toNumber(q.latestUpdate) || Date.now()),
    };
  }

  // Unofficial Yahoo Finance single quote (rapid or fallback). Using rapid's finance endpoint would need a key; here we try a public endpoint pattern.
  private async fetchYahoo(symbol: string): Promise<ExternalQuote | null> {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
      symbol,
    )}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      return null;
    }
    if (!res.ok) return null;
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return null;
    }
    if (!isYahooResponse(json) || !json.quoteResponse?.result?.length) {
      return null;
    }
    const r = json.quoteResponse.result[0];
    if (!r || typeof r.regularMarketPrice !== 'number') return null;
    return {
      symbol: r.symbol || symbol,
      price: r.regularMarketPrice,
      open: toNumber(r.regularMarketOpen),
      high: toNumber(r.regularMarketDayHigh),
      low: toNumber(r.regularMarketDayLow),
      previousClose: toNumber(r.regularMarketPreviousClose),
      volume: toNumber(r.regularMarketVolume),
      bid: toNumber(r.bid),
      ask: toNumber(r.ask),
      bidSize: toNumber(r.bidSize),
      askSize: toNumber(r.askSize),
      provider: 'yahoo',
      timestamp: new Date(
        typeof r.regularMarketTime === 'number'
          ? r.regularMarketTime * 1000
          : Date.now(),
      ),
    };
  }

  // Financial Modeling Prep (FMP) real-time quote endpoint
  private async fetchFMP(symbol: string): Promise<ExternalQuote | null> {
    if (!process.env.FMP_API_KEY) return null;
    const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(
      symbol,
    )}?apikey=${process.env.FMP_API_KEY}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      return null;
    }
    if (!res.ok) return null;
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return null;
    }
    // FMP returns an array for the quote endpoint
    if (!Array.isArray(json) || !json.length) return null;
    const quote = json[0] as unknown;
    if (!isFMPQuote(quote) || typeof quote.price !== 'number') return null;

    return {
      symbol: quote.symbol || symbol.toUpperCase(),
      price: quote.price,
      open: toNumber(quote.open),
      high: toNumber(quote.dayHigh),
      low: toNumber(quote.dayLow),
      previousClose: toNumber(quote.previousClose),
      volume: toNumber(quote.volume),
      // FMP doesn't provide bid/ask in the basic quote endpoint
      // You could use the /quote-short endpoint for bid/ask if needed
      provider: 'fmp',
      timestamp: new Date(
        typeof quote.timestamp === 'number'
          ? quote.timestamp * 1000
          : Date.now(),
      ),
    };
  }
}
