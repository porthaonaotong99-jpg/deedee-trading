import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStockCategoryDto {
  @ApiProperty({ example: 'Technology' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'uuid-of-user',
    description: 'Creator user id (optional - usually from auth context)',
  })
  @IsOptional()
  @IsString()
  created_by?: string;
}
