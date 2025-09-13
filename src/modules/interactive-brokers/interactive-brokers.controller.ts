import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InteractiveBrokersService } from './services/interactive-brokers.service';
import { IBStock } from './interfaces/ib.interface';

@ApiTags('interactive-brokers')
@Controller('interactive-brokers')
export class InteractiveBrokersController {
  constructor(private readonly service: InteractiveBrokersService) {}

  @Get('market-data/:symbol')
  @ApiOperation({ summary: 'Get mock market data for symbol' })
  async marketData(@Param('symbol') symbol: string) {
    const stock: IBStock = {
      symbol,
      secType: 'STK',
      exchange: 'SMART',
      currency: 'USD',
    };
    return this.service.getMarketData(stock);
  }

  @Get('positions')
  @ApiOperation({ summary: 'List mock positions' })
  async positions(@Query('accountId') accountId: string) {
    return this.service.getPositions(accountId || 'DU0000');
  }

  @Get('orders')
  @ApiOperation({ summary: 'List mock orders' })
  async orders(@Query('orderId') orderId?: string) {
    if (!orderId) return { message: 'Provide orderId to query status' };
    const numeric = Number(orderId);
    if (Number.isNaN(numeric)) return { message: 'orderId must be number' };
    return this.service.getOrderStatus(numeric);
  }

  @Get('historical/:symbol')
  @ApiOperation({ summary: 'Get mock historical data for symbol' })
  @ApiQuery({ name: 'range', required: false })
  historical(@Param('symbol') symbol: string) {
    // Not implemented in service; placeholder response
    return {
      symbol,
      candles: [],
      note: 'Historical endpoint not implemented yet',
    };
  }
}
