import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CustomerStocksService } from './customer-stocks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtCustomerAuthGuard } from '../auth/guards/jwt-customer.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../common/interfaces';
import {
  handleSuccessPaginated,
  handleSuccessOne,
} from '../../common/utils/response.util';

@ApiTags('customer-stocks')
@ApiBearerAuth()
@Controller('customer-stocks')
export class CustomerStocksController {
  constructor(private readonly service: CustomerStocksService) {}

  @Get()
  @UseGuards(JwtCustomerAuthGuard)
  @ApiOperation({ summary: 'List customer stock holdings (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query() query: PaginationQueryDto,
    @AuthUser() user: JwtPayload,
  ) {
    // Only allow customers to list their own stock holdings and inject customerId from token
    if (user.type !== 'customer') {
      throw new ForbiddenException('Only customers can access this route');
    }
    const result = await this.service.findAllForCustomer(user.sub, query);
    return handleSuccessPaginated({
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      message: 'CustomerStocks fetched',
    });
  }

  @Get(':id')
  @UseGuards(JwtCustomerAuthGuard)
  @Permissions('customer-stocks:read')
  @ApiOperation({ summary: 'Get customer stock holding by id' })
  @ApiResponse({ status: 200 })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'customer') {
      throw new ForbiddenException('Only customers can access this route');
    }
    const data = await this.service.findOneByCustomer(id, user.sub);
    return handleSuccessOne({ data, message: 'CustomerStock found' });
  }

  // Customer self-access route: derive customerId from JWT token
  @Get('summary/me')
  @UseGuards(JwtCustomerAuthGuard)
  @ApiOperation({ summary: 'Get my portfolio summary (customer)' })
  @ApiResponse({ status: 200 })
  async getMySummary(@AuthUser() user: JwtPayload) {
    if (user.type !== 'customer') {
      throw new ForbiddenException('Only customers can access this route');
    }
    const summary = await this.service.getSummary(user.sub);

    const cur = 'USD'.toUpperCase();
    const fmtCurrency = (n: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: cur,
        currencyDisplay: 'narrowSymbol',
        maximumFractionDigits: 2,
      }).format(n);
    const fmtPercent = (n: number) => {
      const sign = n >= 0 ? '+' : '';
      return `${sign}${n.toFixed(1)}%`;
    };

    const payload = {
      totals: {
        totalValue: summary.totalValue,
        totalInvested: summary.totalInvested,
        totalProfit: summary.totalProfit,
        profitPercent: Number(summary.profitPercent.toFixed(1)),
      },
      display: {
        totalValue: fmtCurrency(summary.totalValue),
        totalInvested: fmtCurrency(summary.totalInvested),
        totalProfit: fmtCurrency(summary.totalProfit),
        profitPercent: fmtPercent(summary.profitPercent),
      },
    };

    return handleSuccessOne({ data: payload, message: 'Portfolio summary' });
  }
}
