import {
  Controller,
  Get,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtCustomerAuthGuard } from '../auth/guards/jwt-customer.guard';
import { DashboardService } from './dashboard.service';
import {
  DashboardChartQueryDto,
  PortfolioPerformanceDto,
  MarketPerformanceDto,
} from './dto/dashboard.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../common/interfaces';
import { handleSuccessOne } from '../../common/utils/response.util';

@ApiTags('Customer Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtCustomerAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('investment-portfolio-performance')
  @ApiOperation({
    summary: 'Get investment portfolio performance chart data',
    description:
      'Returns monthly portfolio performance data for investment returns, showing portfolio value progression over time with YTD percentage change.',
  })
  @ApiQuery({ name: 'year', required: false, type: Number })
  //   @ApiQuery({ name: 'currency', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Investment portfolio performance data retrieved successfully',
    type: PortfolioPerformanceDto,
  })
  async getInvestmentPortfolioPerformance(
    @Query() query: DashboardChartQueryDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'customer') {
      throw new ForbiddenException('Only customers can access dashboard data');
    }

    const data = await this.dashboardService.getInvestmentPortfolioPerformance(
      user.sub,
      query,
    );

    return handleSuccessOne({
      data,
      message: 'Investment portfolio performance retrieved successfully',
    });
  }

  @Get('global-market-performance')
  @ApiOperation({
    summary: 'Get global market investments performance chart data',
    description:
      'Returns monthly market performance data for customer stock investments, showing market value progression over time with YTD percentage change.',
  })
  @ApiQuery({ name: 'year', required: false, type: Number })
  //   @ApiQuery({ name: 'currency', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Global market performance data retrieved successfully',
    type: MarketPerformanceDto,
  })
  async getGlobalMarketPerformance(
    @Query() query: DashboardChartQueryDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'customer') {
      throw new ForbiddenException('Only customers can access dashboard data');
    }

    const data = await this.dashboardService.getGlobalMarketPerformance(
      user.sub,
      query,
    );

    return handleSuccessOne({
      data,
      message: 'Global market performance retrieved successfully',
    });
  }
}
