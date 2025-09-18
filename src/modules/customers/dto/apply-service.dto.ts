import { CustomerServiceType } from '../entities/customer-service.entity';
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
} from 'class-validator';
import {
  EmploymentStatus,
  MaritalStatus,
  RiskTolerance,
} from '../../../common/enums';

export class ApplyServiceDocumentDto {
  @ApiProperty({ enum: CustomerDocumentType, example: 'identity_front' })
  @IsEnum(CustomerDocumentType)
  doc_type!: CustomerDocumentType;

  @ApiProperty({
    description: 'Storage reference (e.g. S3 key or path)',
    example: 's3://kyc-docs/abc123/id-front.jpg',
  })
  storage_ref!: string;

  @ApiPropertyOptional({
    description: 'Checksum (sha256 hex) for integrity',
    example: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899',
  })
  checksum?: string;
}

export class ApplyServiceAddressDto {
  @ApiPropertyOptional({ example: 'LA' })
  @IsOptional()
  @IsString()
  country_id?: string;
  @ApiPropertyOptional({ example: 'LA-VT' })
  @IsOptional()
  @IsString()
  province_id?: string;
  @ApiPropertyOptional({ example: 'LA-VT-01' })
  @IsOptional()
  @IsString()
  district_id?: string;
  @ApiPropertyOptional({ example: 'Ban Phonexay' })
  @IsOptional()
  @IsString()
  village?: string;
  @ApiPropertyOptional({ example: 'House 12, Lane 3' })
  @IsOptional()
  @IsString()
  address_line?: string;
  @ApiPropertyOptional({ example: '01000' })
  @IsOptional()
  @IsString()
  postal_code?: string;
}

export class ApplyServiceKycDto {
  @ApiPropertyOptional({
    description: 'Date of birth (YYYY-MM-DD)',
    example: '1990-04-15',
  })
  dob?: string;
  @ApiPropertyOptional({ example: 'LA' })
  @IsOptional()
  @IsString()
  nationality?: string;
  @ApiPropertyOptional({ example: 'single' })
  @IsOptional()
  @IsEnum(MaritalStatus)
  marital_status?: string;
  @ApiPropertyOptional({ example: 'employed' })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  employment_status?: string;
  @ApiPropertyOptional({ example: 60000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annual_income?: number;
  @ApiPropertyOptional({ example: 'LaoTech Finance' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  employer_name?: string;
  @ApiPropertyOptional({ example: 'analyst' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  occupation?: string;
  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  investment_experience?: number;
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  dependent_number?: number;
  @ApiPropertyOptional({ example: 'salary_savings' })
  @IsOptional()
  @IsString()
  source_of_funds?: string;
  @ApiPropertyOptional({ example: 'medium' })
  @IsOptional()
  @IsEnum(RiskTolerance)
  risk_tolerance?: string;
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  pep_flag?: boolean;
  @ApiPropertyOptional({ example: 'LA-INV-889900' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tax_id?: string;
  @ApiPropertyOptional({ example: 'non_us_person' })
  @IsOptional()
  @IsString()
  fatca_status?: string;
}

export class ApplyServiceDto {
  @ApiProperty({ enum: CustomerServiceType, example: 'premium_membership' })
  @IsEnum(CustomerServiceType)
  service_type!: CustomerServiceType;

  @ApiPropertyOptional({
    type: ApplyServiceKycDto,
    example: {
      dob: '1996-05-12',
      nationality: 'LA',
      risk_tolerance: 'medium',
    },
  })
  kyc?: ApplyServiceKycDto;

  @ApiPropertyOptional({
    type: ApplyServiceAddressDto,
    example: {
      country_id: 'LA',
      province_id: 'LA-VT',
      district_id: 'LA-VT-01',
      village: 'Ban Phonexay',
      address_line: 'House 12, Lane 3',
      postal_code: '01000',
    },
  })
  address?: ApplyServiceAddressDto;

  @ApiPropertyOptional({
    type: [ApplyServiceDocumentDto],
    example: [
      {
        doc_type: 'identity_front',
        storage_ref: 's3://kyc-docs/abc123/id-front.jpg',
      },
    ],
  })
  documents?: ApplyServiceDocumentDto[];
}

export class ApplyServiceResponseDto {
  @ApiProperty({ description: 'Service activation status', example: 'active' })
  status!: string;
  @ApiProperty({ enum: CustomerServiceType, example: 'premium_membership' })
  service_type!: CustomerServiceType;
  @ApiProperty({ enum: KycLevel, required: false, example: 'basic' })
  kyc_level?: KycLevel;
}
