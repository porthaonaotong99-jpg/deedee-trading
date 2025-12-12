import {
  Controller,
  Get,
  Query,
  UseGuards,
  ForbiddenException,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import {
  AdminDashboardQueryDto,
  AdminDashboardStatsDto,
  RecentActivityDto,
  AdminRevenueChartDto,
  AdminCustomerGrowthChartDto,
  AdminStockPicksChartDto,
  AdminSubscriptionsChartDto,
  AdminStockTransactionsChartDto,
} from './dto/admin-dashboard.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../common/interfaces';
import { handleSuccessOne } from '../../common/utils/response.util';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(JwtUserAuthGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get admin dashboard statistics',
    description:
      'Returns comprehensive statistics for the admin dashboard including customer counts, investment totals, and pending requests.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard statistics retrieved successfully',
    type: AdminDashboardStatsDto,
  })
  async getStats(@AuthUser() user: JwtPayload) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can access dashboard stats');
    }

    const data = await this.adminDashboardService.getAdminStats();

    return handleSuccessOne({
      data,
      message: 'Admin dashboard statistics retrieved successfully',
    });
  }

  @Get('recent-activities')
  @ApiOperation({
    summary: 'Get recent activities for admin dashboard',
    description:
      'Returns recent activities including new registrations, investment requests, return requests, and topup requests.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of activities to return (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent activities retrieved successfully',
    type: [RecentActivityDto],
  })
  async getRecentActivities(
    @AuthUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException(
        'Only admins can access dashboard activities',
      );
    }

    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit || '20', 10) || 20),
    );
    const data = await this.adminDashboardService.getRecentActivities(limitNum);

    return handleSuccessOne({
      data,
      message: 'Recent activities retrieved successfully',
    });
  }

  @Get('revenue-chart')
  @ApiOperation({
    summary: 'Get revenue chart data',
    description: 'Returns monthly revenue data for chart visualization.',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year for chart data (default: current year)',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue chart data retrieved successfully',
    type: AdminRevenueChartDto,
  })
  async getRevenueChart(
    @AuthUser() user: JwtPayload,
    @Query(ValidationPipe) query: AdminDashboardQueryDto,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can access revenue chart');
    }

    const data = await this.adminDashboardService.getRevenueChart(query);

    return handleSuccessOne({
      data,
      message: 'Revenue chart data retrieved successfully',
    });
  }

  @Get('customer-growth-chart')
  @ApiOperation({
    summary: 'Get customer growth chart data',
    description:
      'Returns monthly customer growth data for chart visualization.',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year for chart data (default: current year)',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer growth chart data retrieved successfully',
    type: AdminCustomerGrowthChartDto,
  })
  async getCustomerGrowthChart(
    @AuthUser() user: JwtPayload,
    @Query(ValidationPipe) query: AdminDashboardQueryDto,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException(
        'Only admins can access customer growth chart',
      );
    }

    const data = await this.adminDashboardService.getCustomerGrowthChart(query);

    return handleSuccessOne({
      data,
      message: 'Customer growth chart data retrieved successfully',
    });
  }

  @Get('stock-picks-chart')
  @ApiOperation({
    summary: 'Get stock picks chart data',
    description: 'Returns monthly stock picks data for chart visualization.',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year for chart data (default: current year)',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock picks chart data retrieved successfully',
    type: AdminStockPicksChartDto,
  })
  async getStockPicksChart(
    @AuthUser() user: JwtPayload,
    @Query(ValidationPipe) query: AdminDashboardQueryDto,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can access stock picks chart');
    }

    const data = await this.adminDashboardService.getStockPicksChart(query);

    return handleSuccessOne({
      data,
      message: 'Stock picks chart data retrieved successfully',
    });
  }

  @Get('subscriptions-chart')
  @ApiOperation({
    summary: 'Get subscriptions chart data',
    description: 'Returns monthly subscriptions data for chart visualization.',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year for chart data (default: current year)',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions chart data retrieved successfully',
    type: AdminSubscriptionsChartDto,
  })
  async getSubscriptionsChart(
    @AuthUser() user: JwtPayload,
    @Query(ValidationPipe) query: AdminDashboardQueryDto,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException(
        'Only admins can access subscriptions chart',
      );
    }

    const data = await this.adminDashboardService.getSubscriptionsChart(query);

    return handleSuccessOne({
      data,
      message: 'Subscriptions chart data retrieved successfully',
    });
  }

  @Get('stock-transactions-chart')
  @ApiOperation({
    summary: 'Get stock transactions chart data',
    description:
      'Returns monthly stock transactions data for chart visualization.',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year for chart data (default: current year)',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock transactions chart data retrieved successfully',
    type: AdminStockTransactionsChartDto,
  })
  async getStockTransactionsChart(
    @AuthUser() user: JwtPayload,
    @Query(ValidationPipe) query: AdminDashboardQueryDto,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException(
        'Only admins can access stock transactions chart',
      );
    }

    const data =
      await this.adminDashboardService.getStockTransactionsChart(query);

    return handleSuccessOne({
      data,
      message: 'Stock transactions chart data retrieved successfully',
    });
  }
}
