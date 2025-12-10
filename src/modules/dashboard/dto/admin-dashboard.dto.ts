import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminDashboardQueryDto {
  @ApiPropertyOptional({ description: 'Year for chart data', example: 2025 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({
    description: 'Period for stats: day, week, month, year',
    example: 'month',
  })
  @IsOptional()
  @IsString()
  period?: 'day' | 'week' | 'month' | 'year';
}

export class AdminDashboardStatsDto {
  @ApiProperty({ description: 'Total number of customers' })
  totalCustomers: number;

  @ApiProperty({ description: 'Total customers this month' })
  newCustomersThisMonth: number;

  @ApiProperty({ description: 'Total verified customers' })
  verifiedCustomers: number;

  @ApiProperty({ description: 'Total active customers' })
  activeCustomers: number;

  @ApiProperty({ description: 'Total staff members' })
  totalStaff: number;

  @ApiProperty({ description: 'Total investment amount' })
  totalInvestments: number;

  @ApiProperty({ description: 'Display formatted total investments' })
  displayTotalInvestments: string;

  @ApiProperty({ description: 'Pending investment requests count' })
  pendingInvestmentRequests: number;

  @ApiProperty({ description: 'Pending return requests count' })
  pendingReturnRequests: number;

  @ApiProperty({ description: 'Pending topup requests count' })
  pendingTopupRequests: number;

  @ApiProperty({ description: 'Total wallet balance across all customers' })
  totalWalletBalance: number;

  @ApiProperty({ description: 'Display formatted total wallet balance' })
  displayTotalWalletBalance: string;

  @ApiProperty({ description: 'Pending KYC requests count' })
  pendingKycRequests: number;

  @ApiProperty({ description: 'Total revenue (approved investments)' })
  totalRevenue: number;

  @ApiProperty({ description: 'Display formatted total revenue' })
  displayTotalRevenue: string;
}

export class RecentActivityDto {
  @ApiProperty({ description: 'Activity ID' })
  id: string;

  @ApiProperty({ description: 'Activity type' })
  type:
    | 'customer_registration'
    | 'investment_request'
    | 'return_request'
    | 'topup_request'
    | 'kyc_submission'
    | 'stock_purchase';

  @ApiProperty({ description: 'Activity title' })
  title: string;

  @ApiProperty({ description: 'Activity description' })
  description: string;

  @ApiProperty({ description: 'Related entity ID' })
  entityId: string;

  @ApiProperty({ description: 'Related entity type' })
  entityType: string;

  @ApiProperty({ description: 'Activity timestamp' })
  timestamp: Date;

  @ApiProperty({ description: 'Associated customer name', nullable: true })
  customerName: string | null;

  @ApiProperty({ description: 'Amount if applicable', nullable: true })
  amount: number | null;

  @ApiProperty({ description: 'Display formatted amount', nullable: true })
  displayAmount: string | null;
}

export class AdminChartDataPointDto {
  @ApiProperty({ description: 'Month label', example: 'Jan' })
  month: string;

  @ApiProperty({ description: 'Full month name', example: 'January' })
  monthFull: string;

  @ApiProperty({ description: 'Value' })
  value: number;

  @ApiProperty({ description: 'Display formatted value' })
  displayValue: string;
}

export class AdminRevenueChartDto {
  @ApiProperty({
    description: 'Chart data by month',
    type: [AdminChartDataPointDto],
  })
  chartData: AdminChartDataPointDto[];

  @ApiProperty({ description: 'Total for the period' })
  total: number;

  @ApiProperty({ description: 'Display formatted total' })
  displayTotal: string;

  @ApiProperty({ description: 'Year' })
  year: number;
}

export class AdminCustomerGrowthChartDto {
  @ApiProperty({
    description: 'Chart data by month',
    type: [AdminChartDataPointDto],
  })
  chartData: AdminChartDataPointDto[];

  @ApiProperty({ description: 'Total customers' })
  totalCustomers: number;

  @ApiProperty({ description: 'Growth percentage' })
  growthPercent: number;

  @ApiProperty({ description: 'Display growth percentage' })
  displayGrowthPercent: string;

  @ApiProperty({ description: 'Year' })
  year: number;
}
