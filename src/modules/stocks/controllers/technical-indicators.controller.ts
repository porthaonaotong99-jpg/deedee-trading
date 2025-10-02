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
  RSISignal,
  TechnicalSummary,
  SupportResistanceAnalysis,
  MarketMoversResponse,
  TechnicalAnalysisSummary,
} from '../services/technical-indicators.types';

@ApiTags('Technical Indicators')
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
      'Returns RSI value and signal (oversold/neutral/overbought) for a given symbol',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol (e.g., AAPL)',
    example: 'AAPL',
  })
  @ApiQuery({
    name: 'resolution',
    required: false,
    description: 'Time resolution',
    example: 'D',
    enum: ['1', '5', '15', '30', '60', 'D', 'W', 'M'],
  })
  @ApiQuery({
    name: 'timeperiod',
    required: false,
    description: 'RSI time period',
    example: 14,
  })
  @ApiResponse({ status: 200, description: 'RSI data retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No RSI data available for symbol' })
  async getRSI(
    @Param('symbol') symbol: string,
    @Query('resolution') resolution = 'D',
    @Query('timeperiod') timeperiod = 14,
  ): Promise<RSISignal | { error: string }> {
    this.logger.debug(
      `Getting RSI for ${symbol} (${resolution}, ${timeperiod})`,
    );

    const result = await this.technicalIndicatorsService.getRSI(
      symbol.toUpperCase(),
      resolution,
      Number(timeperiod),
    );

    if (!result) {
      return { error: `No RSI data available for ${symbol}` };
    }

    return result;
  }

  @Get(':symbol/technical-summary')
  @ApiOperation({
    summary: 'Get technical analysis summary for a symbol',
    description: 'Returns overall technical recommendation and key indicators',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol (e.g., AAPL)',
    example: 'AAPL',
  })
  @ApiQuery({
    name: 'resolution',
    required: false,
    description: 'Time resolution',
    example: 'D',
    enum: ['1', '5', '15', '30', '60', 'D', 'W', 'M'],
  })
  @ApiResponse({
    status: 200,
    description: 'Technical summary retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No technical data available for symbol',
  })
  async getTechnicalSummary(
    @Param('symbol') symbol: string,
    @Query('resolution') resolution = 'D',
  ): Promise<TechnicalSummary | { error: string }> {
    this.logger.debug(
      `Getting technical summary for ${symbol} (${resolution})`,
    );

    const result = await this.technicalIndicatorsService.getTechnicalSummary(
      symbol.toUpperCase(),
      resolution,
    );

    if (!result) {
      return { error: `No technical summary available for ${symbol}` };
    }

    return result;
  }

  @Get(':symbol/support-resistance')
  @ApiOperation({
    summary: 'Get support and resistance levels for a symbol',
    description:
      'Returns nearest support/resistance levels and their distances',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol (e.g., AAPL)',
    example: 'AAPL',
  })
  @ApiResponse({
    status: 200,
    description: 'Support/resistance data retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No support/resistance data available for symbol',
  })
  async getSupportResistance(
    @Param('symbol') symbol: string,
  ): Promise<SupportResistanceAnalysis | { error: string }> {
    this.logger.debug(`Getting support/resistance for ${symbol}`);

    const result = await this.technicalIndicatorsService.getSupportResistance(
      symbol.toUpperCase(),
    );

    if (!result) {
      return { error: `No support/resistance data available for ${symbol}` };
    }

    return result;
  }

  @Get('market-movers')
  @ApiOperation({
    summary: 'Get market movers (top gainers and losers)',
    description:
      'Returns top 10 gainers and losers from a curated stock universe',
  })
  @ApiResponse({
    status: 200,
    description: 'Market movers retrieved successfully',
  })
  @ApiResponse({ status: 500, description: 'Failed to retrieve market movers' })
  async getMarketMovers(): Promise<MarketMoversResponse | { error: string }> {
    this.logger.debug('Getting market movers');

    const result = await this.technicalIndicatorsService.getMarketMovers();

    if (!result) {
      return { error: 'Failed to retrieve market movers' };
    }

    return result;
  }

  @Get(':symbol/comprehensive-summary')
  @ApiOperation({
    summary: 'Get comprehensive technical analysis summary',
    description:
      'Returns a concise summary with RSI, technical signals, and support/resistance',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol (e.g., AAPL)',
    example: 'AAPL',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive summary retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No technical data available for symbol',
  })
  async getComprehensiveSummary(
    @Param('symbol') symbol: string,
  ): Promise<TechnicalAnalysisSummary | { error: string }> {
    this.logger.debug(`Getting comprehensive summary for ${symbol}`);

    const result =
      await this.technicalIndicatorsService.getComprehensiveSummary(
        symbol.toUpperCase(),
      );

    if (!result) {
      return { error: `No technical data available for ${symbol}` };
    }

    return result;
  }

  @Get('health-check')
  @ApiOperation({
    summary: 'Health check for technical indicators service',
    description: 'Check if Finnhub API is accessible and configured properly',
  })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is not available' })
  async healthCheck(): Promise<{
    status: string;
    message: string;
    timestamp: Date;
  }> {
    const finnhubKey = process.env.FINNHUB_KEY;

    if (!finnhubKey) {
      return {
        status: 'unhealthy',
        message: 'FINNHUB_KEY environment variable is not set',
        timestamp: new Date(),
      };
    }

    // Test with a simple API call
    try {
      const testResult = await this.technicalIndicatorsService.getRSI('AAPL');

      return {
        status: 'healthy',
        message: testResult
          ? 'Finnhub API accessible and working'
          : 'Finnhub API accessible but no data returned',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Finnhub API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }
}
