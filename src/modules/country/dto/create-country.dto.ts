import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CountryStatus } from '../entities/country.entity';

export class CreateCountryDto {
  @ApiProperty({ example: 'Thailand', description: 'Country name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    enum: CountryStatus,
    example: CountryStatus.ACTIVE,
    description: 'Country status',
  })
  @IsOptional()
  @IsEnum(CountryStatus)
  status?: CountryStatus;
}
