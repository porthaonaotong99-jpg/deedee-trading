import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProvinceStatus } from '../entities/province.entity';

export class CreateProvinceDto {
  @ApiProperty({ example: 'Bangkok', description: 'Province name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'uuid-of-country', description: 'Country ID' })
  @IsUUID()
  @IsNotEmpty()
  country_id: string;

  @ApiPropertyOptional({
    enum: ProvinceStatus,
    example: ProvinceStatus.ACTIVE,
    description: 'Province status',
  })
  @IsOptional()
  @IsEnum(ProvinceStatus)
  status?: ProvinceStatus;
}
