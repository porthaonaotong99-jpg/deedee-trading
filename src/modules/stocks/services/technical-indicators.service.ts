import { Injectable, Logger } from '@nestjs/common';
import {
  RSISignal,
  TechnicalSummary,
  SupportResistanceAnalysis,
  SupportResistanceLevel,
  MarketMoversResponse,
  MarketMoverStock,
  TechnicalAnalysisSummary,
  TechnicalIndicatorComponent,
  FinnhubRsiResponse,
  FinnhubTechnicalAnalysisResponse,
  FinnhubSupportResistanceResponse,
  FinnhubQuoteResponse,
} from './technical-indicators.types';

@Injectable()
export class TechnicalIndicatorsService {
  private readonly logger = new Logger(TechnicalIndicatorsService.name);
  private readonly finnhubApiKey = process.env.FINNHUB_KEY;
  private readonly baseUrl = 'https://finnhub.io/api/v1';

  // Common universe of stocks for market movers analysis
  private readonly STOCK_UNIVERSE = [
    'AAPL',
    'MSFT',
    'GOOGL',
    'AMZN',
    'TSLA',
    'META',
    'NVDA',
    'NFLX',
    'CRM',
    'ADBE',
    'INTC',
    'AMD',
    'ORCL',
    'IBM',
    'UBER',
    'SPOT',
    'PYPL',
    'SQ',
    'SHOP',
    'ZM',
    'TWTR',
    'SNAP',
    'PINS',
    'ROKU',
    'PLTR',
    'SNOW',
    'DDOG',
    'MDB',
    'CRWD',
    'ZS',
  ];

  constructor() {
    if (!this.finnhubApiKey) {
      this.logger.error('FINNHUB_KEY is required for technical indicators');
    } else {
      this.logger.log(
        'Technical Indicators Service initialized with Finnhub API',
      );
    }
  }

  /**
   * Type-safe JSON parsing utility
   */
  private async parseApiResponse<T>(response: Response): Promise<T | null> {
    try {
      const json: unknown = await response.json();
      return json as T;
    } catch {
      return null;
    }
  }

  /**
   * 1. Get RSI for a symbol and classify the signal
   */
  async getRSI(
    symbol: string,
    resolution = 'D',
    timeperiod = 14,
  ): Promise<RSISignal | null> {
    if (!this.finnhubApiKey) {
      this.logger.error('Finnhub API key not available');
      return null;
    }

    try {
      const to = Math.floor(Date.now() / 1000);
      const from = to - 365 * 24 * 60 * 60; // 1 year ago

      const url = `${this.baseUrl}/indicator?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&indicator=rsi&timeperiod=${timeperiod}&token=${this.finnhubApiKey}`;

      this.logger.debug(
        `Fetching RSI for ${symbol}: ${url.replace(/token=[^&]+/, 'token=***')}`,
      );

      const response = await fetch(url);
      if (!response.ok) {
        this.logger.error(
          `RSI API failed for ${symbol}: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const data = await this.parseApiResponse<FinnhubRsiResponse>(response);
      if (!data) {
        this.logger.error(`Failed to parse RSI response for ${symbol}`);
        return null;
      }

      if (data.s !== 'ok' || !data.rsi || data.rsi.length === 0) {
        this.logger.warn(`No RSI data available for ${symbol}`);
        return null;
      }

      // Get the latest RSI value
      const latestRSI = data.rsi[data.rsi.length - 1];

      let status: 'oversold' | 'neutral' | 'overbought';
      if (latestRSI <= 30) {
        status = 'oversold';
      } else if (latestRSI >= 70) {
        status = 'overbought';
      } else {
        status = 'neutral';
      }

      this.logger.debug(
        `RSI for ${symbol}: ${latestRSI.toFixed(2)} (${status})`,
      );

      return {
        symbol,
        rsi: Math.round(latestRSI * 100) / 100,
        status,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error fetching RSI for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 2. Get technical summary/aggregate signal for a symbol
   */
  async getTechnicalSummary(
    symbol: string,
    resolution = 'D',
  ): Promise<TechnicalSummary | null> {
    if (!this.finnhubApiKey) {
      this.logger.error('Finnhub API key not available');
      return null;
    }

    try {
      const url = `${this.baseUrl}/scan/technical-indicator?symbol=${symbol}&resolution=${resolution}&token=${this.finnhubApiKey}`;

      this.logger.debug(
        `Fetching technical summary for ${symbol}: ${url.replace(/token=[^&]+/, 'token=***')}`,
      );

      const response = await fetch(url);
      if (!response.ok) {
        this.logger.error(
          `Technical summary API failed for ${symbol}: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const data =
        await this.parseApiResponse<FinnhubTechnicalAnalysisResponse>(response);
      if (!data) {
        this.logger.error(
          `Failed to parse technical analysis response for ${symbol}`,
        );
        return null;
      }

      if (!data.technicalAnalysis) {
        this.logger.warn(`No technical analysis data available for ${symbol}`);
        return null;
      }

      const ta = data.technicalAnalysis;
      const indicators: TechnicalIndicatorComponent[] = [];

      // Extract key indicators
      if (ta.rsi) {
        indicators.push({
          name: 'RSI',
          value: Math.round(ta.rsi.rsi * 100) / 100,
          signal: ta.rsi.signal,
        });
      }

      if (ta.macd) {
        indicators.push({
          name: 'MACD',
          value: Math.round(ta.macd.macd * 10000) / 10000,
          signal: ta.macd.signal,
        });
      }

      if (ta.sma) {
        indicators.push({
          name: 'SMA',
          value: Math.round(ta.sma.sma * 100) / 100,
          signal: ta.sma.signal,
        });
      }

      if (ta.ema) {
        indicators.push({
          name: 'EMA',
          value: Math.round(ta.ema.ema * 100) / 100,
          signal: ta.ema.signal,
        });
      }

      if (ta.adx) {
        indicators.push({
          name: 'ADX',
          value: Math.round(ta.adx.adx * 100) / 100,
          signal: ta.adx.signal,
        });
      }

      // Determine overall recommendation based on signal counts
      let overallRecommendation: 'buy' | 'sell' | 'neutral' = 'neutral';
      if (ta.signal) {
        overallRecommendation = ta.signal;
      } else if (ta.count) {
        if (ta.count.buy > ta.count.sell) {
          overallRecommendation = 'buy';
        } else if (ta.count.sell > ta.count.buy) {
          overallRecommendation = 'sell';
        }
      }

      this.logger.debug(
        `Technical summary for ${symbol}: ${overallRecommendation} (${indicators.length} indicators)`,
      );

      return {
        symbol,
        overallRecommendation,
        indicators: indicators.slice(0, 5), // Limit to 5 key indicators
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error fetching technical summary for ${symbol}:`,
        error,
      );
      return null;
    }
  }

  /**
   * 3. Get support/resistance levels and compute nearest levels
   */
  async getSupportResistance(
    symbol: string,
  ): Promise<SupportResistanceAnalysis | null> {
    if (!this.finnhubApiKey) {
      this.logger.error('Finnhub API key not available');
      return null;
    }

    try {
      // Get current price first
      const currentPrice = await this.getCurrentPrice(symbol);
      if (!currentPrice) {
        this.logger.error(`Could not get current price for ${symbol}`);
        return null;
      }

      // Get support/resistance levels
      const srUrl = `${this.baseUrl}/scan/support-resistance?symbol=${symbol}&resolution=D&token=${this.finnhubApiKey}`;

      this.logger.debug(
        `Fetching support/resistance for ${symbol}: ${srUrl.replace(/token=[^&]+/, 'token=***')}`,
      );

      const response = await fetch(srUrl);
      if (!response.ok) {
        this.logger.error(
          `Support/Resistance API failed for ${symbol}: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const data =
        await this.parseApiResponse<FinnhubSupportResistanceResponse>(response);
      if (!data) {
        this.logger.error(
          `Failed to parse support/resistance response for ${symbol}`,
        );
        return null;
      }

      if (!data.levels || data.levels.length === 0) {
        this.logger.warn(
          `No support/resistance levels available for ${symbol}`,
        );
        return {
          symbol,
          currentPrice,
          nearestSupport: null,
          nearestResistance: null,
          supportDistance: null,
          resistanceDistance: null,
          levels: [],
          timestamp: new Date(),
        };
      }

      // Classify levels as support or resistance based on current price
      const levels: SupportResistanceLevel[] = data.levels.map((level) => ({
        level,
        type: level < currentPrice ? 'support' : 'resistance',
      }));

      // Find nearest support (highest level below current price)
      const supportLevels = levels
        .filter((l) => l.type === 'support')
        .map((l) => l.level)
        .sort((a, b) => b - a);

      const nearestSupport = supportLevels.length > 0 ? supportLevels[0] : null;

      // Find nearest resistance (lowest level above current price)
      const resistanceLevels = levels
        .filter((l) => l.type === 'resistance')
        .map((l) => l.level)
        .sort((a, b) => a - b);

      const nearestResistance =
        resistanceLevels.length > 0 ? resistanceLevels[0] : null;

      // Calculate distances as percentages
      const supportDistance = nearestSupport
        ? Math.round(((currentPrice - nearestSupport) / currentPrice) * 10000) /
          100
        : null;

      const resistanceDistance = nearestResistance
        ? Math.round(
            ((nearestResistance - currentPrice) / currentPrice) * 10000,
          ) / 100
        : null;

      this.logger.debug(
        `Support/Resistance for ${symbol}: Support=${nearestSupport} (${supportDistance}%), Resistance=${nearestResistance} (${resistanceDistance}%)`,
      );

      return {
        symbol,
        currentPrice,
        nearestSupport,
        nearestResistance,
        supportDistance,
        resistanceDistance,
        levels,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error fetching support/resistance for ${symbol}:`,
        error,
      );
      return null;
    }
  }

  /**
   * 4. Get top gainers and losers from the stock universe
   */
  async getMarketMovers(): Promise<MarketMoversResponse | null> {
    if (!this.finnhubApiKey) {
      this.logger.error('Finnhub API key not available');
      return null;
    }

    try {
      this.logger.debug(
        `Fetching market data for ${this.STOCK_UNIVERSE.length} stocks`,
      );

      // Fetch quotes for all symbols in parallel
      const promises = this.STOCK_UNIVERSE.map(async (symbol) => {
        try {
          const quote = await this.getQuote(symbol);
          if (!quote) return null;

          const changePercent = ((quote.c - quote.pc) / quote.pc) * 100;

          return {
            symbol,
            lastPrice: quote.c,
            changePercent: Math.round(changePercent * 100) / 100,
            change: Math.round((quote.c - quote.pc) * 100) / 100,
            high: quote.h,
            low: quote.l,
            volume: quote.v || 0,
          } as MarketMoverStock;
        } catch (error) {
          this.logger.warn(`Failed to fetch quote for ${symbol}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      const validResults = results.filter(
        (r): r is MarketMoverStock => r !== null,
      );

      if (validResults.length === 0) {
        this.logger.error('No valid market data obtained');
        return null;
      }

      // Sort by change percentage
      const sortedByGain = [...validResults].sort(
        (a, b) => b.changePercent - a.changePercent,
      );
      const topGainers = sortedByGain.slice(0, 10);
      const topLosers = sortedByGain.slice(-10).reverse();

      this.logger.debug(
        `Market movers: ${topGainers.length} gainers, ${topLosers.length} losers from ${validResults.length} stocks`,
      );

      return {
        topGainers,
        topLosers,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Error fetching market movers:', error);
      return null;
    }
  }

  /**
   * 5. Get comprehensive technical analysis summary for a symbol
   */
  async getComprehensiveSummary(
    symbol: string,
  ): Promise<TechnicalAnalysisSummary | null> {
    try {
      this.logger.debug(`Getting comprehensive analysis for ${symbol}`);

      const [rsi, summary, sr] = await Promise.all([
        this.getRSI(symbol),
        this.getTechnicalSummary(symbol),
        this.getSupportResistance(symbol),
      ]);

      if (!rsi && !summary && !sr) {
        this.logger.warn(`No technical data available for ${symbol}`);
        return null;
      }

      // Format RSI
      const rsiString = rsi ? `${rsi.rsi} (${rsi.status})` : 'N/A';

      // Format summary signal
      const summarySignal = summary?.overallRecommendation || 'neutral';

      // Format support/resistance
      const supportString =
        sr?.nearestSupport && sr?.supportDistance
          ? `${sr.nearestSupport.toFixed(2)} (${sr.supportDistance > 0 ? '+' : ''}${sr.supportDistance.toFixed(1)}%)`
          : 'N/A';

      const resistanceString =
        sr?.nearestResistance && sr?.resistanceDistance
          ? `${sr.nearestResistance.toFixed(2)} (+${sr.resistanceDistance.toFixed(1)}%)`
          : 'N/A';

      return {
        symbol,
        rsi: rsiString,
        summarySignal,
        nearestSupport: supportString,
        nearestResistance: resistanceString,
      };
    } catch (error) {
      this.logger.error(
        `Error getting comprehensive summary for ${symbol}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Helper: Get current price for a symbol
   */
  private async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      const quote = await this.getQuote(symbol);
      return quote?.c || null;
    } catch (error) {
      this.logger.error(`Error getting current price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Helper: Get basic quote data from Finnhub
   */
  private async getQuote(symbol: string): Promise<FinnhubQuoteResponse | null> {
    try {
      const url = `${this.baseUrl}/quote?symbol=${symbol}&token=${this.finnhubApiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await this.parseApiResponse<FinnhubQuoteResponse>(response);
      if (!data) {
        return null;
      }

      // Validate required fields
      if (typeof data.c !== 'number' || typeof data.pc !== 'number') {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }
}
