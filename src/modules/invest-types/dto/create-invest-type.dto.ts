import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvestTypeStatus } from '../../../common/enums';

export class CreateInvestTypeDto {
  @ApiProperty({ example: 'Growth Plan', description: 'Investment type name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @IsNumber()
  profit?: number;

  @ApiPropertyOptional({ example: 3.5, description: 'Change percent' })
  @IsOptional()
  @IsNumber()
  change?: number;

  @ApiPropertyOptional({
    enum: InvestTypeStatus,
    example: InvestTypeStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(InvestTypeStatus)
  status?: InvestTypeStatus;
}
