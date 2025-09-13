import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoundStatus } from '../../../common/enums';

export class CreateBoundDto {
  @ApiProperty({ example: 'Bound Alpha' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ enum: BoundStatus, example: BoundStatus.ACTIVE })
  @IsOptional()
  @IsEnum(BoundStatus)
  status?: BoundStatus;

  @ApiPropertyOptional({ example: 'uuid-invest-type-id' })
  @IsOptional()
  @IsUUID()
  invest_type?: string;
}
