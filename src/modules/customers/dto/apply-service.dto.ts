import {
  CustomerServiceType,
  SubscriptionDuration,
} from '../entities/customer-service.entity';
import { CustomerDocumentType } from '../entities/customer-document.entity';
import { KycLevel } from '../entities/customer-kyc.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EmploymentStatus,
  MaritalStatus,
  RiskTolerance,
} from '../../../common/enums';

export class ApplyServiceDocumentDto {
  @ApiProperty({ enum: CustomerDocumentType })
  @IsEnum(CustomerDocumentType)
  doc_type!: CustomerDocumentType;

  @ApiProperty({
    description: 'Storage reference (e.g. S3 key or path)',
  })
  storage_ref!: string;

  @ApiPropertyOptional({
    description: 'Checksum (sha256 hex) for integrity',
  })
  checksum?: string;
}

export class ApplyServiceAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country_id?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province_id?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district_id?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  village?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_line?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postal_code?: string;
}

export class ApplyServiceKycDto {
  @ApiPropertyOptional({
    description: 'Date of birth (YYYY-MM-DD)',
  })
  dob?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(MaritalStatus)
  marital_status?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(EmploymentStatus)
  employment_status?: string;
  @ApiPropertyOptional({
    description: 'Annual income range string, e.g. "$10,000 - $100,000"',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  annual_income?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  employer_name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  occupation?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  investment_experience?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  dependent_number?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source_of_funds?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(RiskTolerance)
  risk_tolerance?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pep_flag?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tax_id?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fatca_status?: string;
}

export class ApplyServiceSubscriptionDto {
  @ApiProperty({
    description: 'Subscription duration in months',
    enum: SubscriptionDuration,
    example: SubscriptionDuration.SIX_MONTHS,
  })
  @IsEnum(SubscriptionDuration)
  duration: SubscriptionDuration;

  @ApiPropertyOptional({
    description: 'Subscription fee (will be calculated if not provided)',
    example: 549.99,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fee?: number;
}

export class ApplyServiceDto {
  @ApiProperty({ enum: CustomerServiceType })
  @IsEnum(CustomerServiceType)
  service_type!: CustomerServiceType;

  @ApiPropertyOptional({
    type: ApplyServiceKycDto,
  })
  kyc?: ApplyServiceKycDto;

  @ApiPropertyOptional({
    type: ApplyServiceAddressDto,
  })
  address?: ApplyServiceAddressDto;

  @ApiPropertyOptional({
    type: [ApplyServiceDocumentDto],
  })
  documents?: ApplyServiceDocumentDto[];

  @ApiPropertyOptional({
    type: ApplyServiceSubscriptionDto,
    description:
      'Required for subscription-based services like premium_membership',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ApplyServiceSubscriptionDto)
  subscription?: ApplyServiceSubscriptionDto;
}

export class ApplyServiceResponseDto {
  @ApiProperty({ description: 'Service activation status' })
  status!: string;
  @ApiProperty({ enum: CustomerServiceType })
  service_type!: CustomerServiceType;
  @ApiProperty({ enum: KycLevel, required: false })
  kyc_level?: KycLevel;
}
