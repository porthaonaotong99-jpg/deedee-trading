import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { TechnicalIndicatorsService } from '../services/technical-indicators.service';
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

  @Get('rsi/all-us-stocks')
  @ApiOperation({
    summary: 'Get RSI snapshot for US stock movers',
    description:
      'Aggregates RSI values for the Alpha Vantage US market movers universe (top gainers, losers, most active).',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum symbols to take from each Alpha Vantage category',
    example: 25,
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    description: 'Force a specific provider for RSI calculations',
    example: 'polygon',
    enum: ['polygon', 'alphaVantage'],
  })
  @ApiQuery({
    name: 'interval',
    required: false,
    description:
      'Alpha Vantage interval (used when provider=alphaVantage or when Polygon falls back to Alpha Vantage)',
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
    description: 'RSI period/window',
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
  @ApiResponse({
    status: 200,
    description: 'US market RSI snapshot retrieved successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to retrieve US market RSI snapshot',
  })
  async getAllUsStockRsi(
    @Query('limit') limit = '25',
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
    const parsedLimit = Number(limit) > 0 ? Number(limit) : 25;
    const parsedTimeperiod = Number(timeperiod ?? '14');
    const parsedWindow = window !== undefined ? Number(window) : undefined;
    const allowFallback = fallback !== 'false';

    this.logger.debug(
      `Getting US market RSI snapshot (limit=${parsedLimit}, provider=${provider ?? 'auto'}, timespan=${timespan}, interval=${interval})`,
    );

    try {
      const result = await this.technicalIndicatorsService.getUSMarketRsi({
        limitPerCategory: parsedLimit,
        provider,
        interval,
        timeperiod: parsedTimeperiod,
        timespan,
        window: parsedWindow,
        fallback: allowFallback,
      });

      if (!result) {
        return handleError({
          code: 'RSI_UNIVERSE_ERROR',
          message: 'Failed to build US market RSI snapshot',
          statusCode: 500,
        });
      }

      return handleSuccessOne({
        data: result,
        message: 'US market RSI snapshot retrieved successfully',
      });
    } catch (error) {
      return handleError({
        code: 'RSI_UNIVERSE_ERROR',
        message: 'Failed to retrieve US market RSI snapshot',
        error,
        statusCode: 500,
      });
    }
  }

  @Get('market-movers/all-us-stocks')
  @ApiOperation({
    summary: 'Get ALL US stock market movers using Alpha Vantage',
    description:
      'Returns top gainers and losers from the entire US stock market using Alpha Vantage pre-calculated market movers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Alpha Vantage market movers retrieved successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to retrieve ALL US stock market movers',
  })
  async getAllUSStockMarketMovers() {
    this.logger.debug('Getting ALL US stock market movers from Alpha Vantage');

    try {
      const result =
        await this.technicalIndicatorsService.getAlphaVantageMarketMovers();

      if (!result) {
        return handleError({
          code: 'NOT_AVAILABLE',
          message: 'Failed to retrieve ALL US stock market movers',
          statusCode: 500,
        });
      }

      return handleSuccessOne({
        data: result,
        message: 'Alpha Vantage market movers retrieved successfully',
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
