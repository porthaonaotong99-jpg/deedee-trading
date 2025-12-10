import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { CustomerServiceType } from '../../customers/entities/customer-service.entity';

export class CreateSubscriptionPackageDto {
  @ApiProperty({
    description: 'Service type for the subscription package',
    enum: CustomerServiceType,
    example: CustomerServiceType.PREMIUM_MEMBERSHIP,
  })
  @IsEnum(CustomerServiceType)
  @IsNotEmpty()
  service_type: CustomerServiceType;

  @ApiProperty({
    description: 'Duration in months',
    example: 12,
    minimum: 1,
    maximum: 120,
  })
  @IsNumber()
  @Min(1)
  @Max(120)
  @Type(() => Number)
  duration_months: number;

  @ApiProperty({
    description: 'Price of the subscription package',
    example: 99.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Description of the package',
    example: 'Premium membership with exclusive benefits',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'List of features included in the package',
    example: [
      'Access to premium stock picks',
      'Priority support',
      'Advanced analytics',
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({
    description: 'Whether the package is active',
    example: true,
    default: true,
  })
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
}

export class UpdateSubscriptionPackageDto {
  @ApiPropertyOptional({
    description: 'Service type for the subscription package',
    enum: CustomerServiceType,
  })
  @IsOptional()
  @IsEnum(CustomerServiceType)
  service_type?: CustomerServiceType;

  @ApiPropertyOptional({
    description: 'Duration in months',
    minimum: 1,
    maximum: 120,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  @Type(() => Number)
  duration_months?: number;

  @ApiPropertyOptional({
    description: 'Price of the subscription package',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Description of the package',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'List of features included in the package',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({
    description: 'Whether the package is active',
  })
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
}
