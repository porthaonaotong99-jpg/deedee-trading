import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class TopupServiceDto {
  @ApiProperty({ description: 'Amount to top up', example: 1000.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Optional reference or note', required: false })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class TransferFundsDto {
  @ApiProperty({
    description: 'Source service id (INTERNATIONAL_STOCK_ACCOUNT)',
    format: 'uuid',
  })
  @IsUUID()
  from_service_id!: string;

  @ApiProperty({
    description: 'Destination service id (GUARANTEED_RETURNS)',
    format: 'uuid',
  })
  @IsUUID()
  to_service_id!: string;

  @ApiProperty({ description: 'Amount to transfer', example: 500.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Optional reference or note', required: false })
  @IsOptional()
  @IsString()
  reference?: string;
}
