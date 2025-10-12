import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QuotesService } from './services/quotes.service';
import {
  handleError,
  handleSuccessMany,
} from '../../common/utils/response.util';

@ApiTags('stock-quotes')
@Controller('stocks')
export class StockQuotesController {
  constructor(private readonly quotes: QuotesService) {}

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
    try {
      const payload = await this.quotes.getNormalizedQuote(symbol);
      return handleSuccessMany({
        data: [payload],
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
