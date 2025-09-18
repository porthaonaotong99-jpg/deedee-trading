import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockCategoryEmbeddedExample } from '../../../docs/swagger';

export class CreateStockDto {
  @ApiProperty({ example: 'Apple Inc.', description: 'Full stock name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'AAPL', description: 'Ticker symbol' })
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty({ example: 175.34, description: 'Latest traded price' })
  @IsNumber()
  @Min(0)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseFloat(value) : (value as number),
  )
  last_price: number;

  @ApiPropertyOptional({
    example: '77777777-8888-9999-aaaa-bbbbbbbbbbbb',
    description: 'Optional stock category ID (UUID)',
  })
  @IsUUID()
  @IsOptional()
  stock_categories_id?: string;
}

export class UpdateStockDto {
  @ApiPropertyOptional({
    example: 'Apple Inc. New',
    description: 'Updated stock name',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'AAPL',
    description: 'Updated ticker symbol',
  })
  @IsString()
  @IsOptional()
  symbol?: string;

  @ApiPropertyOptional({ example: 180.5, description: 'Updated price' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseFloat(value) : (value as number),
  )
  last_price?: number;

  @ApiPropertyOptional({
    example: '77777777-8888-9999-aaaa-bbbbbbbbbbbb',
    description: 'Updated category ID',
  })
  @IsUUID()
  @IsOptional()
  stock_categories_id?: string;
}

export class StockResponseDto {
  @ApiProperty({
    example: '11111111-2222-3333-4444-555555555555',
    description: 'Stock UUID',
  })
  id: string;
  @ApiProperty({ example: 'Apple Inc.', description: 'Stock name' })
  name: string;
  @ApiProperty({ example: 'AAPL', description: 'Ticker symbol' })
  symbol: string;
  @ApiProperty({ example: 175.34, description: 'Last price' })
  last_price: number;
  @ApiPropertyOptional({
    example: StockCategoryEmbeddedExample,
    description: 'Category object if related category is loaded',
  })
  stockCategory?: {
    id: string;
    name: string;
  };
  @ApiProperty({
    example: '2025-01-01T10:00:00.000Z',
    description: 'Creation timestamp',
  })
  created_at: Date;
  @ApiProperty({
    example: '2025-01-05T12:00:00.000Z',
    description: 'Last update timestamp',
  })
  updated_at: Date;
}

export class BuyStockDto {
  @ApiProperty({
    example: '11111111-2222-3333-4444-555555555555',
    description: 'Stock ID to buy',
  })
  @IsUUID()
  @IsNotEmpty()
  stock_id: string;

  @ApiProperty({ example: 10, description: 'Quantity of shares to buy' })
  @IsNumber()
  @Min(0.01)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseFloat(value) : (value as number),
  )
  quantity: number;

  @ApiProperty({ example: 175.5, description: 'Buy price per share' })
  @IsNumber()
  @Min(0.01)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseFloat(value) : (value as number),
  )
  buy_price: number;
}

export class SellStockDto {
  @ApiProperty({
    example: '11111111-2222-3333-4444-555555555555',
    description: 'Stock ID to sell',
  })
  @IsUUID()
  @IsNotEmpty()
  stock_id: string;

  @ApiProperty({ example: 5, description: 'Quantity of shares to sell' })
  @IsNumber()
  @Min(0.01)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseFloat(value) : (value as number),
  )
  quantity: number;

  @ApiProperty({ example: 180.25, description: 'Sell price per share' })
  @IsNumber()
  @Min(0.01)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseFloat(value) : (value as number),
  )
  sell_price: number;
}
