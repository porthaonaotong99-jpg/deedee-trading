import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { TechnicalIndicatorsService } from '../services/technical-indicators.service';
import type {
  PriceResolution,
  StockPriceHistoryRange,
  PolygonFinancialTimeframe,
} from '../services/technical-indicators.types';
import {
  handleError,
  handleSuccessOne,
} from '../../../common/utils/response.util';

@ApiTags('technical Indicators')
@Controller('technical-indicators')
export class TechnicalIndicatorsController {
  private readonly logger = new Logger(TechnicalIndicatorsController.name);

  constructor(
    private readonly technicalIndicatorsService: TechnicalIndicatorsService,
  ) {}

  @Get(':symbol/rsi')
  @ApiOperation({
    summary: 'Get RSI for a symbol',
    description:
      'Returns RSI value and signal (oversold/neutral/overbought) for a given symbol using Polygon and Alpha Vantage providers',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol (e.g., AAPL)',
    example: 'AAPL',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    description: 'Force a specific provider',
    example: 'polygon',
    enum: ['polygon', 'alphaVantage'],
  })
  @ApiQuery({
    name: 'interval',
    required: false,
    description:
      'Alpha Vantage interval (used when provider=alphaVantage or fallback)',
    example: 'daily',
    enum: [
      '1min',
      '5min',
      '15min',
      '30min',
      '60min',
      'daily',
      'weekly',
      'monthly',
    ],
  })
  @ApiQuery({
    name: 'timeperiod',
    required: false,
    description: 'RSI period/window (Polygon window defaults to this value)',
    example: 14,
  })
  @ApiQuery({
    name: 'timespan',
    required: false,
    description: 'Polygon timespan (used when provider=polygon)',
    example: 'day',
    enum: ['minute', 'hour', 'day', 'week', 'month'],
  })
  @ApiQuery({
    name: 'window',
    required: false,
    description: 'Polygon RSI window override',
    example: 14,
  })
  @ApiQuery({
    name: 'fallback',
    required: false,
    description:
      'Allow fallback from Polygon to Alpha Vantage when Polygon fails',
    example: true,
  })
  @ApiResponse({ status: 200, description: 'RSI data retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No RSI data available for symbol' })
  async getRSI(
    @Param('symbol') symbol: string,
    @Query('provider') provider?: 'polygon' | 'alphaVantage',
    @Query('interval')
    interval:
      | '1min'
      | '5min'
      | '15min'
      | '30min'
      | '60min'
      | 'daily'
      | 'weekly'
      | 'monthly' = 'daily',
    @Query('timeperiod') timeperiod = '14',
    @Query('timespan')
    timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day',
    @Query('window') window?: string,
    @Query('fallback') fallback = 'true',
  ) {
    const parsedTimeperiod = Number(timeperiod ?? '14');
    const parsedWindow = window !== undefined ? Number(window) : undefined;
    const allowFallback = fallback !== 'false';

    this.logger.debug(
      `Getting RSI for ${symbol} using provider=${provider ?? 'auto'} (interval=${interval}, timeperiod=${parsedTimeperiod}, timespan=${timespan}, window=${parsedWindow ?? 'default'}, fallback=${allowFallback})`,
    );

    try {
      const result = await this.technicalIndicatorsService.getRSI(
        symbol.toUpperCase(),
        {
          provider,
          interval,
          timeperiod: parsedTimeperiod,
          timespan,
          window: parsedWindow,
          fallback: allowFallback,
        },
      );

      if (!result) {
        return handleError({
          code: 'NOT_FOUND',
          message: `No RSI data available for ${symbol}`,
          statusCode: 404,
        });
      }

      return handleSuccessOne({
        data: result,
        message: 'RSI data retrieved successfully',
      });
    } catch (error) {
      return handleError({
        code: 'RSI_ERROR',
        message: 'Failed to retrieve RSI data',
        error,
        statusCode: 500,
      });
    }
  }

  @Get(':symbol/rsi/alpha-vantage')
  @ApiOperation({
    summary: 'Get RSI for a symbol using Alpha Vantage',
    description:
      'Returns RSI value and signal (oversold/neutral/overbought) for a given symbol using Alpha Vantage API',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol (e.g., AAPL)',
    example: 'AAPL',
  })
  @ApiQuery({
    name: 'interval',
    required: false,
    description: 'Time interval',
    example: 'daily',
    enum: [
      '1min',
      '5min',
      '15min',
      '30min',
      '60min',
      'daily',
      'weekly',
      'monthly',
    ],
  })
  @ApiQuery({
    name: 'timeperiod',
    required: false,
    description: 'RSI time period',
    example: 14,
  })
  @ApiResponse({
    status: 200,
    description: 'Alpha Vantage RSI data retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No Alpha Vantage RSI data available for symbol',
  })
  async getAlphaVantageRSI(
    @Param('symbol') symbol: string,
    @Query('interval')
    interval:
      | '1min'
      | '5min'
      | '15min'
      | '30min'
      | '60min'
      | 'daily'
      | 'weekly'
      | 'monthly' = 'daily',
    @Query('timeperiod') timeperiod = '14',
  ) {
    this.logger.debug(
      `Getting Alpha Vantage RSI for ${symbol} (${interval}, ${timeperiod})`,
    );

    try {
      const result = await this.technicalIndicatorsService.getAlphaVantageRSI(
        symbol.toUpperCase(),
        interval,
        Number(timeperiod),
      );

      if (!result) {
        return handleError({
          code: 'NOT_FOUND',
          message: `No Alpha Vantage RSI data available for ${symbol}`,
          statusCode: 404,
        });
      }

      return handleSuccessOne({
        data: result,
        message: 'Alpha Vantage RSI data retrieved successfully',
      });
    } catch (error) {
      return handleError({
        code: 'ALPHA_RSI_ERROR',
        message: 'Failed to retrieve Alpha Vantage RSI data',
        error,
        statusCode: 500,
      });
    }
  }

  @Get(':symbol/rsi/polygon')
  @ApiOperation({
    summary: 'Get RSI for a symbol using Polygon.io',
    description:
      'Returns RSI value and signal (oversold/neutral/overbought) for a given symbol using Polygon indicators API',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol (e.g., AAPL)',
    example: 'AAPL',
  })
  @ApiQuery({
    name: 'timespan',
    required: false,
    description: 'Polygon timespan granularity',
    example: 'day',
    enum: ['minute', 'hour', 'day', 'week', 'month'],
  })
  @ApiQuery({
    name: 'window',
    required: false,
    description: 'Polygon RSI window length',
    example: 14,
  })
  @ApiResponse({
    status: 200,
    description: 'Polygon RSI data retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No Polygon RSI data available for symbol',
  })
  async getPolygonRSI(
    @Param('symbol') symbol: string,
    @Query('timespan')
    timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day',
    @Query('window') window = '14',
  ) {
    this.logger.debug(
      `Getting Polygon RSI for ${symbol} (${timespan}, window=${window})`,
    );

    try {
      const result = await this.technicalIndicatorsService.getPolygonRSI(
        symbol.toUpperCase(),
        timespan,
        Number(window),
      );

      if (!result) {
        return handleError({
          code: 'NOT_FOUND',
          message: `No Polygon RSI data available for ${symbol}`,
          statusCode: 404,
        });
      }

      return handleSuccessOne({
        data: result,
        message: 'Polygon RSI data retrieved successfully',
      });
    } catch (error) {
      return handleError({
        code: 'POLYGON_RSI_ERROR',
        message: 'Failed to retrieve Polygon RSI data',
        error,
        statusCode: 500,
      });
    }
  }

  @Get(':symbol/overview')
  @ApiOperation({
    summary: 'Get stock overview snapshot',
    description:
      'Provides price snapshot, support levels, optional RSI, and company metadata for dashboard views.',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol (e.g., AAPL)',
    example: 'AAPL',
  })
  @ApiQuery({
    name: 'includeRsi',
    required: false,
    description: 'Include RSI indicator in the response',
    example: 'true',
  })
  @ApiQuery({
    name: 'supportResolution',
    required: false,
    description: 'Resolution used to compute support levels',
    example: 'day',
    enum: ['day', 'week', 'month'],
  })
  @ApiResponse({ status: 200, description: 'Overview data returned' })
  @ApiResponse({ status: 500, description: 'Failed to build overview' })
  async getStockOverview(
    @Param('symbol') symbol: string,
    @Query('includeRsi') includeRsi?: string,
    @Query('supportResolution') supportResolution?: string,
  ) {
    const allowedResolutions: PriceResolution[] = ['day', 'week', 'month'];
    const include = includeRsi
      ? !['0', 'false', 'no'].includes(includeRsi.trim().toLowerCase())
      : false;
    const candidateResolution = (supportResolution ?? 'day').toLowerCase();
    const resolution =
      allowedResolutions.find((value) => value === candidateResolution) ??
      'day';

    try {
      const data = await this.technicalIndicatorsService.getStockOverview(
        symbol.toUpperCase(),
        {
          includeRsi: include,
          supportResolution: resolution,
        },
      );

      return handleSuccessOne({
        data,
        message: 'Stock overview retrieved',
      });
    } catch (error) {
      return handleError({
        code: 'OVERVIEW_ERROR',
        message: 'Failed to retrieve stock overview',
        error,
        statusCode: 500,
      });
    }
  }

  @Get(':symbol/price-history')
  @ApiOperation({
    summary: 'Get price history series with support levels',
    description:
      'Returns price history for dashboards with optional support/resistance levels.',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol (e.g., AAPL)',
    example: 'AAPL',
  })
  @ApiQuery({
    name: 'range',
    required: false,
    description: 'Historical range to retrieve',
    enum: ['1M', '3M', '6M', 'YTD', '1Y'],
    example: '6M',
  })
  @ApiQuery({
    name: 'supportResolution',
    required: false,
    description: 'Resolution used to compute support levels',
    example: 'day',
    enum: ['day', 'week', 'month'],
  })
  @ApiResponse({ status: 200, description: 'Price history returned' })
  @ApiResponse({ status: 500, description: 'Failed to fetch price history' })
  async getPriceHistory(
    @Param('symbol') symbol: string,
    @Query('range') range?: string,
    @Query('supportResolution') supportResolution?: string,
  ) {
    const allowedRanges: StockPriceHistoryRange[] = [
      '1M',
      '3M',
      '6M',
      'YTD',
      '1Y',
    ];
    const allowedResolutions: PriceResolution[] = ['day', 'week', 'month'];
    const candidateRange = (range ?? '6M').toUpperCase();
    const normalizedRange =
      allowedRanges.find((value) => value === candidateRange) ?? '6M';
    const candidateResolution = (supportResolution ?? 'day').toLowerCase();
    const resolution =
      allowedResolutions.find((value) => value === candidateResolution) ??
      'day';

    try {
      const data = await this.technicalIndicatorsService.getStockPriceHistory(
        symbol.toUpperCase(),
        normalizedRange,
        resolution,
      );

      return handleSuccessOne({
        data,
        message: 'Price history retrieved',
      });
    } catch (error) {
      return handleError({
        code: 'PRICE_HISTORY_ERROR',
        message: 'Failed to retrieve price history',
        error,
        statusCode: 500,
      });
    }
  }

  @Get(':symbol/performance')
  @ApiOperation({
    summary: 'Get timeframe performance metrics',
    description: 'Computes percent change across common dashboard timeframes.',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol (e.g., AAPL)',
    example: 'AAPL',
  })
  @ApiResponse({ status: 200, description: 'Performance metrics returned' })
  @ApiResponse({ status: 500, description: 'Failed to compute performance' })
  async getPerformance(@Param('symbol') symbol: string) {
    try {
      const data = await this.technicalIndicatorsService.getStockPerformance(
        symbol.toUpperCase(),
      );

      return handleSuccessOne({
        data,
        message: 'Performance metrics retrieved',
      });
    } catch (error) {
      return handleError({
        code: 'PERFORMANCE_ERROR',
        message: 'Failed to retrieve performance metrics',
        error,
        statusCode: 500,
      });
    }
  }

  @Get(':symbol/financials/revenue')
  @ApiOperation({
    summary: 'Get quarterly revenue series',
    description:
      'Fetches quarterly revenue with year-over-year growth for financial charts.',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol (e.g., AAPL)',
    example: 'AAPL',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of filings to retrieve (max 100)',
    example: '100',
  })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    description: 'Financial timeframe to request',
    example: 'quarterly',
    enum: ['quarterly', 'annual'],
  })
  @ApiQuery({
    name: 'order',
    required: false,
    description: 'Sort order for the filings',
    example: 'asc',
    enum: ['asc', 'desc'],
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Polygon sort field (defaults to filing_date)',
    example: 'filing_date',
  })
  @ApiResponse({ status: 200, description: 'Revenue series returned' })
  @ApiResponse({ status: 500, description: 'Failed to fetch revenue data' })
  async getRevenue(
    @Param('symbol') symbol: string,
    @Query('limit') limit = '100',
    @Query('timeframe') timeframe: PolygonFinancialTimeframe = 'quarterly',
    @Query('order') order: 'asc' | 'desc' = 'asc',
    @Query('sort') sort = 'filing_date',
  ) {
    const numericLimit = Number(limit);
    const parsedLimit = Number.isFinite(numericLimit)
      ? Math.min(Math.max(Math.floor(numericLimit), 1), 100)
      : 100;
    const normalizedTimeframe: PolygonFinancialTimeframe =
      timeframe === 'annual' ? 'annual' : 'quarterly';
    const normalizedOrder: 'asc' | 'desc' = order === 'desc' ? 'desc' : 'asc';
    const normalizedSort = sort?.trim() || 'filing_date';

    try {
      const data = await this.technicalIndicatorsService.getStockRevenueSeries(
        symbol.toUpperCase(),
        {
          limit: parsedLimit,
          timeframe: normalizedTimeframe,
          order: normalizedOrder,
          sort: normalizedSort,
        },
      );

      return handleSuccessOne({
        data,
        message: 'Revenue series retrieved',
      });
    } catch (error) {
      return handleError({
        code: 'REVENUE_ERROR',
        message: 'Failed to retrieve revenue series',
        error,
        statusCode: 500,
      });
    }
  }

  @Get(':symbol/news')
  @ApiOperation({
    summary: 'Get latest company news',
    description:
      'Returns curated news articles for the symbol sourced from the Google Apps Script dataset.',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol (e.g., AAPL)',
    example: 'AAPL',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of articles to return (max 20)',
    example: '6',
  })
  @ApiResponse({ status: 200, description: 'News articles returned' })
  @ApiResponse({ status: 500, description: 'Failed to fetch news' })
  async getNews(@Param('symbol') symbol: string, @Query('limit') limit = '6') {
    const parsedLimit = Number.isFinite(Number(limit))
      ? Math.min(Math.max(Number(limit), 1), 20)
      : 6;

    try {
      const data = await this.technicalIndicatorsService.getStockNews(
        symbol.toUpperCase(),
        parsedLimit,
      );

      return handleSuccessOne({
        data,
        message: 'News articles retrieved',
      });
    } catch (error) {
      return handleError({
        code: 'NEWS_ERROR',
        message: 'Failed to retrieve news articles',
        error,
        statusCode: 500,
      });
    }
  }

  @Get('rsi/all-us-stocks')
  @ApiOperation({
    summary: 'Get RSI extremes for the entire US market',
    description:
      'Fetches oversold (RSI ≤ 30) and overbought (RSI ≥ 70) groups from the curated Google Apps Script feed for instant dashboards.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description:
      'Maximum number of stocks to return per RSI bucket (oversold & overbought).',
    example: 25,
  })
  @ApiResponse({
    status: 200,
    description: 'US market RSI extremes retrieved successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to retrieve US market RSI extremes',
  })
  async getAllUsStockRsi(@Query('limit') limit = '25') {
    const parsedLimitRaw = Number(limit);
    const parsedLimit =
      Number.isFinite(parsedLimitRaw) && parsedLimitRaw > 0
        ? Math.floor(parsedLimitRaw)
        : 25;

    this.logger.debug(
      `Getting US market RSI extremes from Google dataset (limit=${parsedLimit})`,
    );

    try {
      const result = await this.technicalIndicatorsService.getUSMarketRsi({
        limitPerBucket: parsedLimit,
      });

      if (!result) {
        return handleError({
          code: 'RSI_UNIVERSE_ERROR',
          message: 'Failed to build US market RSI extremes from the dataset',
          statusCode: 500,
        });
      }

      return handleSuccessOne({
        data: result,
        message: 'US market RSI extremes retrieved successfully',
      });
    } catch (error) {
      return handleError({
        code: 'RSI_UNIVERSE_ERROR',
        message: 'Failed to retrieve US market RSI extremes',
        error,
        statusCode: 500,
      });
    }
  }

  @Get('market-movers/all-us-stocks')
  @ApiOperation({
    summary: 'Get ALL US stock market movers via Google Apps Script feed',
    description:
      'Returns top gainers and losers from the curated Google Apps Script dataset (≈440 US stocks) without hitting third-party rate limits.',
  })
  @ApiResponse({
    status: 200,
    description: 'ALL US stock market movers retrieved successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to retrieve ALL US stock market movers',
  })
  async getAllUSStockMarketMovers() {
    this.logger.debug(
      'Getting ALL US stock market movers from Google Apps Script dataset',
    );

    try {
      const result =
        await this.technicalIndicatorsService.getGoogleScriptMarketMovers();

      if (!result) {
        return handleError({
          code: 'NOT_AVAILABLE',
          message: 'Failed to retrieve ALL US stock market movers',
          statusCode: 500,
        });
      }

      return handleSuccessOne({
        data: result,
        message: 'ALL US stock market movers retrieved successfully',
      });
    } catch (error) {
      return handleError({
        code: 'ALL_STOCK_MOVERS_ERROR',
        message: 'Failed to retrieve ALL US stock market movers',
        error,
        statusCode: 500,
      });
    }
  }

  @Get('market-movers/us-losers/breaking-support')
  @ApiOperation({
    summary: 'Get US losers breaking support levels',
    description:
      'Returns curated US stock losers near/below support sourced from the external Google Apps Script dataset.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of symbols to return',
    example: 10,
  })
  @ApiQuery({
    name: 'tolerancePercent',
    required: false,
    description:
      'Legacy tolerance metadata (kept for compatibility, default 8%)',
    example: 8,
  })
  @ApiQuery({
    name: 'minDropPercent',
    required: false,
    description:
      'Legacy intraday drop metadata (kept for compatibility, default 0.5%)',
    example: 0.5,
  })
  @ApiQuery({
    name: 'resolution',
    required: false,
    description:
      'Resolution stored in metadata (daily, weekly, or monthly aggregates)',
    example: 'day',
    enum: ['day', 'week', 'month'],
  })
  @ApiResponse({
    status: 200,
    description: 'US losers near or breaking support retrieved successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to retrieve US losers breaking support',
  })
  async getUsLosersBreakingSupport(
    @Query('limit') limit = '10',
    @Query('tolerancePercent') tolerancePercent = '8',
    @Query('minDropPercent') minDropPercent = '0.5',
    @Query('resolution') resolution: PriceResolution = 'day',
  ) {
    const parsedLimit = Number(limit) > 0 ? Number(limit) : 10;
    const parsedToleranceRaw = Number(tolerancePercent);
    const parsedTolerance = Number.isFinite(parsedToleranceRaw)
      ? Math.max(0, parsedToleranceRaw)
      : 8;
    const parsedDropRaw = Number(minDropPercent);
    const parsedDrop = Number.isFinite(parsedDropRaw)
      ? Math.max(0, parsedDropRaw)
      : 0.5;

    this.logger.debug(
      `Getting US losers breaking support (limit=${parsedLimit}, tolerance=${parsedTolerance}%, minDrop=${parsedDrop}%, resolution=${resolution})`,
    );

    try {
      const result =
        await this.technicalIndicatorsService.getUSLosersBreakingSupport({
          limit: parsedLimit,
          tolerancePercent: parsedTolerance,
          minDropPercent: parsedDrop,
          resolution,
        });

      if (!result) {
        return handleError({
          code: 'SUPPORT_BREAK_ERROR',
          message: 'Failed to find US losers breaking support',
          statusCode: 500,
        });
      }

      return handleSuccessOne({
        data: result,
        message: 'US losers near support levels retrieved successfully',
      });
    } catch (error) {
      return handleError({
        code: 'SUPPORT_BREAK_ERROR',
        message: 'Failed to retrieve US losers breaking support',
        error,
        statusCode: 500,
      });
    }
  }

  @Get('health-check')
  @ApiOperation({
    summary: 'Health check for technical indicators service',
    description:
      'Validates that at least one technical indicator provider is configured and reachable',
  })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is not available' })
  async healthCheck() {
    const hasAlpha = Boolean(process.env.ALPHA_VANTAGE_KEY);
    const hasPolygon = Boolean(process.env.POLYGON_API_KEY);

    if (!hasAlpha && !hasPolygon) {
      return handleError({
        code: 'UNHEALTHY',
        message:
          'Configure ALPHA_VANTAGE_KEY or POLYGON_API_KEY to use technical indicators',
        statusCode: 503,
      });
    }

    try {
      const testResult = await this.technicalIndicatorsService.getRSI('AAPL', {
        provider: hasPolygon ? 'polygon' : 'alphaVantage',
        timeperiod: 14,
        timespan: 'day',
        fallback: true,
      });

      return handleSuccessOne({
        data: {
          status: 'healthy',
          message: testResult
            ? 'Technical indicators providers are reachable'
            : 'Providers reachable but no RSI data returned',
          timestamp: new Date(),
          providers: {
            alphaVantage: hasAlpha,
            polygon: hasPolygon,
          },
        },
        message: 'Service health check completed',
      });
    } catch (error) {
      return handleError({
        code: 'UNHEALTHY',
        message: `Technical indicators provider error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error,
        statusCode: 503,
      });
    }
  }
}
