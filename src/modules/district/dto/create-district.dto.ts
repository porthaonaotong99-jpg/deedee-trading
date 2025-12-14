import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DistrictStatus } from '../entities/district.entity';
import { Type } from 'class-transformer';

export class CreateDistrictDto {
  @ApiProperty({ example: 'Bang Rak', description: 'District name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'uuid-of-province', description: 'Province ID' })
  @IsUUID()
  @IsNotEmpty()
  province_id: string;

  @ApiPropertyOptional({ example: 10500, description: 'Postcode' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  postcode?: number;

  @ApiPropertyOptional({
    enum: DistrictStatus,
    example: DistrictStatus.ACTIVE,
    description: 'District status',
  })
  @IsOptional()
  @IsEnum(DistrictStatus)
  status?: DistrictStatus;
}
