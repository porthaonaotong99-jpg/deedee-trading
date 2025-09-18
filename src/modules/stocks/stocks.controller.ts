import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  StocksListResponseExample,
  StockGetOneResponseExample,
  StockCreateRequestExample,
  StockCreateResponseExample,
  StockUpdateRequestExample,
  StockUpdateResponseExample,
  StockDeleteResponseExample,
  StockBuyRequestExample,
  StockBuyResponseExample,
  StockSellRequestExample,
  StockSellResponseExample,
} from '../../docs/swagger';
import { StocksService } from './stocks.service';
import {
  CreateStockDto,
  UpdateStockDto,
  StockResponseDto,
  BuyStockDto,
  SellStockDto,
} from './dto/stock.dto';
import {
  handleSuccessOne,
  handleSuccessMany,
  IOneResponse,
  IManyResponse,
} from '../../common/utils/response.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import type { JwtPayload, PaginationOptions } from '../../common/interfaces';

@ApiTags('stocks')
@ApiBearerAuth()
@Controller('stocks')
@UseGuards(JwtAuthGuard)
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get()
  @ApiOperation({ summary: 'List stocks with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Page number (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'Items per page (default 10)',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    example: 'created_at',
    description: 'Sort field',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    example: 'DESC',
    description: 'Sort order ASC|DESC',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list returned',
    schema: { example: StocksListResponseExample },
  })
  async findAll(@Query() query: PaginationOptions): Promise<
    IManyResponse<StockResponseDto> & {
      page: number;
      limit: number;
      totalPages: number;
    }
  > {
    const result = await this.stocksService.findAll(query);
    const base = handleSuccessMany<StockResponseDto>({
      data: result.data,
      total: result.total,
      message: 'Stocks fetched',
    });
    return {
      ...base,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stock by id' })
  @ApiResponse({
    status: 200,
    description: 'Stock found',
    schema: { example: StockGetOneResponseExample },
  })
  @ApiResponse({ status: 404, description: 'Stock not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IOneResponse<StockResponseDto>> {
    const data = await this.stocksService.findOne(id);
    return handleSuccessOne({ data, message: 'Stock found' });
  }

  @Post()
  @ApiOperation({ summary: 'Create new stock' })
  @ApiBody({
    description: 'Create stock payload',
    schema: ((): Record<string, unknown> => ({
      type: 'object',
      properties: {
        name: { type: 'string' },
        symbol: { type: 'string' },
        last_price: { type: 'number' },
        stock_categories_id: { type: 'string' },
      },
      example: StockCreateRequestExample,
    }))(),
  })
  @ApiResponse({
    status: 200,
    description: 'Stock created',
    schema: { example: StockCreateResponseExample },
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @UseGuards(PermissionsGuard)
  @Permissions('stocks:create')
  async create(
    @Body(ValidationPipe) createStockDto: CreateStockDto,
  ): Promise<IOneResponse<StockResponseDto>> {
    const data = await this.stocksService.create(createStockDto);
    return handleSuccessOne({
      data,
      message: 'Stock created',
      statusCode: 200,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a stock by id' })
  @ApiBody({
    description: 'Update stock payload (partial)',
    schema: ((): Record<string, unknown> => ({
      type: 'object',
      properties: {
        name: { type: 'string' },
        last_price: { type: 'number' },
      },
      example: StockUpdateRequestExample,
    }))(),
  })
  @ApiResponse({
    status: 200,
    description: 'Stock updated',
    schema: { example: StockUpdateResponseExample },
  })
  @ApiResponse({ status: 404, description: 'Stock not found' })
  @UseGuards(PermissionsGuard)
  @Permissions('stocks:update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateStockDto: UpdateStockDto,
  ): Promise<IOneResponse<StockResponseDto>> {
    const data = await this.stocksService.update(id, updateStockDto);
    return handleSuccessOne({ data, message: 'Stock updated' });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a stock by id' })
  @ApiResponse({
    status: 200,
    description: 'Stock deleted',
    schema: { example: StockDeleteResponseExample },
  })
  @ApiResponse({ status: 404, description: 'Stock not found' })
  @UseGuards(PermissionsGuard)
  @Permissions('stocks:delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IOneResponse<null>> {
    await this.stocksService.remove(id);
    return handleSuccessOne({ data: null, message: 'Stock deleted' });
  }

  @Post('buy')
  @ApiOperation({ summary: 'Customer buys stock' })
  @ApiBody({
    description: 'Buy stock payload',
    schema: ((): Record<string, unknown> => ({
      type: 'object',
      properties: {
        stock_id: { type: 'string' },
        quantity: { type: 'number' },
        buy_price: { type: 'number' },
      },
      example: StockBuyRequestExample,
    }))(),
  })
  @ApiResponse({
    status: 200,
    description: 'Buy executed',
    schema: { example: StockBuyResponseExample },
  })
  @ApiResponse({ status: 400, description: 'Validation / business error' })
  async buyStock(
    @AuthUser() user: JwtPayload,
    @Body(ValidationPipe) buyStockDto: BuyStockDto,
  ): Promise<IOneResponse<{ success: boolean; message: string }>> {
    if (user.type !== 'customer') {
      throw new Error('Only customers can buy stocks');
    }
    const data = await this.stocksService.buyStock(user.sub, buyStockDto);
    return handleSuccessOne({ data, message: data.message, statusCode: 200 });
  }

  @Post('sell')
  @ApiOperation({ summary: 'Customer sells stock' })
  @ApiBody({
    description: 'Sell stock payload',
    schema: ((): Record<string, unknown> => ({
      type: 'object',
      properties: {
        stock_id: { type: 'string' },
        quantity: { type: 'number' },
        sell_price: { type: 'number' },
      },
      example: StockSellRequestExample,
    }))(),
  })
  @ApiResponse({
    status: 200,
    description: 'Sell executed',
    schema: { example: StockSellResponseExample },
  })
  @ApiResponse({ status: 400, description: 'Validation / business error' })
  async sellStock(
    @AuthUser() user: JwtPayload,
    @Body(ValidationPipe) sellStockDto: SellStockDto,
  ): Promise<IOneResponse<{ success: boolean; message: string }>> {
    if (user.type !== 'customer') {
      throw new Error('Only customers can sell stocks');
    }
    const data = await this.stocksService.sellStock(user.sub, sellStockDto);
    return handleSuccessOne({ data, message: data.message, statusCode: 200 });
  }
}
