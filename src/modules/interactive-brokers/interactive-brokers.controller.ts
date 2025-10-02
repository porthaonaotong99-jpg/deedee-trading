import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InteractiveBrokersService } from './services/interactive-brokers.service';
import { IBStock, IBOrder } from './interfaces/ib.interface';
import { PlaceOrderDto } from './dto/place-order.dto';
import type {
  PlaceOrderResponseDto,
  ConnectionStatusResponseDto,
  MarketDataResponseDto,
} from './dto/response.dto';

@ApiTags('interactive-brokers')
@Controller('interactive-brokers')
export class InteractiveBrokersController {
  constructor(private readonly service: InteractiveBrokersService) {}

  @Get('market-data/:symbol')
  @ApiOperation({ summary: 'Get real-time market data for symbol' })
  async marketData(
    @Param('symbol') symbol: string,
  ): Promise<MarketDataResponseDto | null> {
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

  @Get('connection-status')
  @ApiOperation({ summary: 'Check IB connection status' })
  connectionStatus(): ConnectionStatusResponseDto {
    return {
      isConnected: this.service.isConnected(),
      connectionInfo: this.service.getConnectionInfo(),
    };
  }

  @Get('trading-mode')
  @ApiOperation({ summary: 'Get current trading mode (PAPER/LIVE)' })
  getTradingMode() {
    const mode = this.service.getTradingMode();
    return {
      mode,
      safe: mode === 'PAPER',
      warning: mode === 'LIVE' ? '⚠️ LIVE TRADING - REAL MONEY AT RISK!' : null,
    };
  }

  @Get('compliance-status')
  @ApiOperation({
    summary: 'Get compliance and risk management status',
    description:
      'Monitor daily trading limits, rate limiting, and regulatory compliance',
  })
  getComplianceStatus() {
    return this.service.getComplianceStatus();
  }

  @Post('emergency-stop')
  @ApiOperation({
    summary: '🚨 Emergency Stop - Cancel all orders and disconnect',
    description: 'Use this endpoint in case of emergency or system malfunction',
  })
  async emergencyStop(@Body() body: { reason?: string }) {
    try {
      await this.service.emergencyStop(body.reason);
      return {
        success: true,
        message: 'Emergency stop executed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Emergency stop failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Post('place-order')
  @ApiOperation({ summary: 'Place an order through IB' })
  async placeOrder(
    @Body() orderRequest: PlaceOrderDto,
  ): Promise<PlaceOrderResponseDto> {
    const stock: IBStock = {
      symbol: orderRequest.symbol,
      secType: orderRequest.secType || 'STK',
      exchange: orderRequest.exchange || 'SMART',
      currency: orderRequest.currency || 'USD',
    };

    const order: IBOrder = {
      action: orderRequest.action,
      orderType: orderRequest.orderType,
      totalQuantity: orderRequest.totalQuantity,
      lmtPrice: orderRequest.lmtPrice,
      auxPrice: orderRequest.auxPrice,
      tif: orderRequest.tif,
    };

    const orderId = await this.service.placeOrder(stock, order);
    return {
      success: orderId !== null,
      orderId,
      message: orderId
        ? `Order placed with ID: ${orderId}`
        : 'Failed to place order',
    };
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
