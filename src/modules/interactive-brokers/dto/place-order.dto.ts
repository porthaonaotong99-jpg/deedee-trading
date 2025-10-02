import { IsString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlaceOrderDto {
  @ApiProperty({
    description: 'Stock symbol',
    example: 'AAPL',
  })
  @IsString()
  symbol: string;

  @ApiProperty({
    description: 'Order action',
    enum: ['BUY', 'SELL'],
    example: 'BUY',
  })
  @IsEnum(['BUY', 'SELL'])
  action: 'BUY' | 'SELL';

  @ApiProperty({
    description: 'Order type',
    enum: ['MKT', 'LMT', 'STP', 'STP LMT'],
    example: 'MKT',
  })
  @IsEnum(['MKT', 'LMT', 'STP', 'STP LMT'])
  orderType: 'MKT' | 'LMT' | 'STP' | 'STP LMT';

  @ApiProperty({
    description: 'Total quantity to trade',
    example: 100,
  })
  @IsNumber()
  totalQuantity: number;

  @ApiPropertyOptional({
    description: 'Limit price (required for LMT orders)',
    example: 150.0,
  })
  @IsOptional()
  @IsNumber()
  lmtPrice?: number;

  @ApiPropertyOptional({
    description: 'Auxiliary price (for stop orders)',
    example: 145.0,
  })
  @IsOptional()
  @IsNumber()
  auxPrice?: number;

  @ApiPropertyOptional({
    description: 'Time in force',
    enum: ['DAY', 'GTC', 'IOC', 'FOK'],
    example: 'DAY',
  })
  @IsOptional()
  @IsEnum(['DAY', 'GTC', 'IOC', 'FOK'])
  tif?: 'DAY' | 'GTC' | 'IOC' | 'FOK';

  @ApiPropertyOptional({
    description: 'Security type',
    enum: ['STK', 'OPT', 'FUT', 'CASH', 'BOND', 'CFD', 'FUND'],
    example: 'STK',
  })
  @IsOptional()
  @IsEnum(['STK', 'OPT', 'FUT', 'CASH', 'BOND', 'CFD', 'FUND'])
  secType?: 'STK' | 'OPT' | 'FUT' | 'CASH' | 'BOND' | 'CFD' | 'FUND';

  @ApiPropertyOptional({
    description: 'Exchange',
    example: 'SMART',
  })
  @IsOptional()
  @IsString()
  exchange?: string;

  @ApiPropertyOptional({
    description: 'Currency',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string;
}
