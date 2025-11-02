import { ApiProperty } from '@nestjs/swagger';

export class EnrichedMarketMoverDto {
  @ApiProperty({ example: 'AAPL' })
  symbol: string;

  @ApiProperty({ example: 'Apple Inc.' })
  companyName?: string;

  @ApiProperty({ example: 262.82 })
  price: number;

  @ApiProperty({ example: 1.25 })
  changePercent: number;

  @ApiProperty({ example: 3.24 })
  change: number;

  @ApiProperty({ example: 265.5 })
  high: number;

  @ApiProperty({ example: 260.0 })
  low: number;

  @ApiProperty({ example: 54321000 })
  volume: number;

  // Technical Indicators
  @ApiProperty({ example: 64.1, required: false })
  rsi?: number;

  @ApiProperty({ example: 250, required: false })
  support1?: number;

  @ApiProperty({ example: 228, required: false })
  support2?: number;

  @ApiProperty({ example: 260, required: false })
  resistance1?: number;

  @ApiProperty({ example: 275, required: false })
  resistance2?: number;

  @ApiProperty({ example: 255.3, required: false })
  ema50?: number;

  @ApiProperty({ example: 245.8, required: false })
  ema200?: number;

  // Categorization
  @ApiProperty({ example: 'หุ้น 7 นางฟ้า', required: false })
  group?: string;

  @ApiProperty({ example: 'US', required: false })
  country?: string;
}

export class EnrichedMarketMoversResponseDto {
  @ApiProperty({ type: [EnrichedMarketMoverDto] })
  topGainers: EnrichedMarketMoverDto[];

  @ApiProperty({ type: [EnrichedMarketMoverDto] })
  topLosers: EnrichedMarketMoverDto[];

  @ApiProperty({ example: 406 })
  totalStocksAnalyzed: number;

  @ApiProperty()
  timestamp: Date;
}

export class MarketMoversQueryDto {
  @ApiProperty({ required: false, default: 10, example: 10 })
  limit?: number;

  @ApiProperty({ required: false, enum: ['all', 'us', 'th'], default: 'all' })
  market?: 'all' | 'us' | 'th';

  @ApiProperty({ required: false, example: 'หุ้น 7 นางฟ้า' })
  group?: string;

  @ApiProperty({ required: false, default: false })
  includeTechnicals?: boolean;
}
