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
    schema: {
      example: {
        is_error: false,
        code: 'SUCCESS',
        message: 'Stocks fetched',
        total: 2,
        data: [
          {
            id: 'uuid1',
            name: 'Apple Inc.',
            symbol: 'AAPL',
            last_price: 175.34,
            stockCategory: { id: 'cat-uuid', name: 'Technology' },
            created_at: '2025-01-01T10:00:00.000Z',
            updated_at: '2025-01-05T12:00:00.000Z',
          },
          {
            id: 'uuid2',
            name: 'Microsoft Corp.',
            symbol: 'MSFT',
            last_price: 402.11,
            stockCategory: { id: 'cat-uuid', name: 'Technology' },
            created_at: '2025-01-02T10:00:00.000Z',
            updated_at: '2025-01-06T12:00:00.000Z',
          },
        ],
        error: null,
        status_code: 200,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
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
    schema: {
      example: {
        is_error: false,
        code: 'SUCCESS',
        message: 'Stock found',
        data: {
          id: 'uuid1',
          name: 'Apple Inc.',
          symbol: 'AAPL',
          last_price: 175.34,
          stockCategory: { id: 'cat-uuid', name: 'Technology' },
          created_at: '2025-01-01T10:00:00.000Z',
          updated_at: '2025-01-05T12:00:00.000Z',
        },
        error: null,
        status_code: 200,
      },
    },
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
    schema: {
      example: {
        name: 'Apple Inc.',
        symbol: 'AAPL',
        last_price: 175.34,
        stock_categories_id: '77777777-8888-9999-aaaa-bbbbbbbbbbbb',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Stock created',
    schema: {
      example: {
        is_error: false,
        code: 'SUCCESS',
        message: 'Stock created',
        data: {
          id: 'new-uuid',
          name: 'Apple Inc.',
          symbol: 'AAPL',
          last_price: 175.34,
          stockCategory: { id: 'cat-uuid', name: 'Technology' },
          created_at: '2025-01-10T10:00:00.000Z',
          updated_at: '2025-01-10T10:00:00.000Z',
        },
        error: null,
        status_code: 200,
      },
    },
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
    schema: {
      example: {
        name: 'Apple Inc. (Updated)',
        last_price: 180.0,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Stock updated',
    schema: {
      example: {
        is_error: false,
        code: 'SUCCESS',
        message: 'Stock updated',
        data: {
          id: 'uuid1',
          name: 'Apple Inc. (Updated)',
          symbol: 'AAPL',
          last_price: 180.0,
          stockCategory: { id: 'cat-uuid', name: 'Technology' },
          created_at: '2025-01-01T10:00:00.000Z',
          updated_at: '2025-01-11T12:00:00.000Z',
        },
        error: null,
        status_code: 200,
      },
    },
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
    schema: {
      example: {
        is_error: false,
        code: 'SUCCESS',
        message: 'Stock deleted',
        data: null,
        error: null,
        status_code: 200,
      },
    },
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
    schema: {
      example: {
        stock_id: '11111111-2222-3333-4444-555555555555',
        quantity: 10,
        buy_price: 175.5,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Buy executed',
    schema: {
      example: {
        is_error: false,
        code: 'SUCCESS',
        message: 'Successfully bought 10 shares of AAPL',
        data: {
          success: true,
          message: 'Successfully bought 10 shares of AAPL',
        },
        error: null,
        status_code: 200,
      },
    },
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
    schema: {
      example: {
        stock_id: '11111111-2222-3333-4444-555555555555',
        quantity: 5,
        sell_price: 180.25,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sell executed',
    schema: {
      example: {
        is_error: false,
        code: 'SUCCESS',
        message: 'Successfully sold 5 shares of AAPL',
        data: {
          success: true,
          message: 'Successfully sold 5 shares of AAPL',
        },
        error: null,
        status_code: 200,
      },
    },
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
