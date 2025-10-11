import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  IsBoolean,
} from 'class-validator';
import { CustomerServiceType } from '../../customers/entities/customer-service.entity';

export class SubscriptionPackageFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by service type',
    enum: CustomerServiceType,
  })
  @IsOptional()
  @IsEnum(CustomerServiceType)
  service_type?: CustomerServiceType;

  @ApiPropertyOptional({ description: 'Filter by active flag' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }): boolean | undefined => {
    if (typeof value === 'string') {
      if (value === 'true') return true;
      if (value === 'false') return false;
    }
    return value as boolean | undefined;
  })
  active?: boolean;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }): number | undefined => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? undefined : num;
    }
    return value as number | undefined;
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }): number | undefined => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? undefined : num;
    }
    return value as number | undefined;
  })
  limit?: number;

  @ApiPropertyOptional({ description: 'Optional search in description' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class SubscriptionPackageResponseDto {
  id: string;
  service_type: CustomerServiceType;
  duration_months: number;
  price: number;
  currency: string;
  description?: string;
  features?: string[];
  active: boolean;
  created_at: Date;
  updated_at: Date;
  // Enriched fields when a customer token is provided
  is_current?: boolean;
  expiredDate?: Date;
  days_left?: number;
}
