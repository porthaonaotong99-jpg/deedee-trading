import { CustomerServiceType } from '../entities/customer-service.entity';
import { CustomerDocumentType } from '../entities/customer-document.entity';
import { KycLevel } from '../entities/customer-kyc.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyServiceDocumentDto {
  @ApiProperty({ enum: CustomerDocumentType })
  doc_type!: CustomerDocumentType;

  @ApiProperty({ description: 'Storage reference (e.g. S3 key or path)' })
  storage_ref!: string;

  @ApiPropertyOptional({ description: 'Checksum (sha256 hex) for integrity' })
  checksum?: string;
}

export class ApplyServiceAddressDto {
  @ApiPropertyOptional()
  country_id?: string;
  @ApiPropertyOptional()
  province_id?: string;
  @ApiPropertyOptional()
  district_id?: string;
  @ApiPropertyOptional()
  village?: string;
  @ApiPropertyOptional()
  address_line?: string;
  @ApiPropertyOptional()
  postal_code?: string;
}

export class ApplyServiceKycDto {
  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)' })
  dob?: string;
  @ApiPropertyOptional()
  nationality?: string;
  @ApiPropertyOptional()
  marital_status?: string;
  @ApiPropertyOptional()
  employment_status?: string;
  @ApiPropertyOptional()
  annual_income?: number;
  @ApiPropertyOptional()
  employer_name?: string;
  @ApiPropertyOptional()
  occupation?: string;
  @ApiPropertyOptional()
  investment_experience?: number;
  @ApiPropertyOptional()
  dependent_number?: number;
  @ApiPropertyOptional()
  source_of_funds?: string;
  @ApiPropertyOptional()
  risk_tolerance?: string;
  @ApiPropertyOptional()
  pep_flag?: boolean;
  @ApiPropertyOptional()
  tax_id?: string;
  @ApiPropertyOptional()
  fatca_status?: string;
}

export class ApplyServiceDto {
  @ApiProperty({ enum: CustomerServiceType })
  service_type!: CustomerServiceType;

  @ApiPropertyOptional({ type: ApplyServiceKycDto })
  kyc?: ApplyServiceKycDto;

  @ApiPropertyOptional({ type: ApplyServiceAddressDto })
  address?: ApplyServiceAddressDto;

  @ApiPropertyOptional({ type: [ApplyServiceDocumentDto] })
  documents?: ApplyServiceDocumentDto[];
}

export class ApplyServiceResponseDto {
  @ApiProperty({ description: 'Service activation status' })
  status!: string;
  @ApiProperty({ enum: CustomerServiceType })
  service_type!: CustomerServiceType;
  @ApiProperty({ enum: KycLevel, required: false })
  kyc_level?: KycLevel;
}
