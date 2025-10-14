import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class DashboardChartQueryDto {
  @ApiPropertyOptional({
    description: 'Year to filter data (default: current year)',
    example: 2025,
    minimum: 2020,
    maximum: 2030,
  })
  @IsOptional()
  @IsNumber()
  @Min(2020)
  @Max(2030)
  @Transform(({ value }): number | undefined => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? undefined : num;
    }
    return value as number | undefined;
  })
  year?: number;

  //   @ApiPropertyOptional({
  //     description: 'Currency code for formatting (default: USD)',
  //     example: 'USD',
  //   })
  //   @IsOptional()
  //   @IsString()
  //   currency?: string;
}

export class ChartDataPointDto {
  @ApiProperty({ description: 'Month name (e.g., Jan, Feb)' })
  month: string;

  @ApiProperty({ description: 'Portfolio value for this month' })
  value: number;

  @ApiProperty({ description: 'Monthly profit/loss for this month' })
  profit: number;

  @ApiProperty({ description: 'Formatted display value (e.g., $52,000)' })
  displayValue: string;

  @ApiProperty({ description: 'Formatted display profit (e.g., +$3,500)' })
  displayProfit: string;
}

export class PortfolioPerformanceDto {
  @ApiProperty({ description: 'Current total portfolio value' })
  currentValue: number;

  @ApiProperty({ description: 'Formatted current value' })
  displayCurrentValue: string;

  @ApiProperty({ description: 'Year-to-date percentage change' })
  ytdPercentChange: number;

  @ApiProperty({ description: 'Formatted YTD percentage (e.g., +50.00%)' })
  displayYtdPercent: string;

  @ApiProperty({
    description: 'Monthly chart data points',
    type: [ChartDataPointDto],
  })
  chartData: ChartDataPointDto[];

  @ApiProperty({ description: 'Description text for the chart' })
  description: string;
}

export class MarketPerformanceDto {
  @ApiProperty({ description: 'Current total market investments value' })
  currentValue: number;

  @ApiProperty({ description: 'Formatted current value' })
  displayCurrentValue: string;

  @ApiProperty({ description: 'Year-to-date percentage change' })
  ytdPercentChange: number;

  @ApiProperty({ description: 'Formatted YTD percentage (e.g., +141.07%)' })
  displayYtdPercent: string;

  @ApiProperty({
    description: 'Monthly chart data points',
    type: [ChartDataPointDto],
  })
  chartData: ChartDataPointDto[];

  @ApiProperty({ description: 'Description text for the chart' })
  description: string;
}
