import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiBody,
  ApiExtraModels,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomersService } from './customers.service';
import {
  ApplyServiceDto,
  ApplyServiceResponseDto,
} from './dto/apply-service.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../common/interfaces';
import { CustomerKyc } from './entities/customer-kyc.entity';
import {
  EmploymentStatus,
  MaritalStatus,
  RiskTolerance,
} from '../../common/enums';
import { handleSuccessOne } from '../../common/utils/response.util';

@ApiTags('customer-services')
@ApiExtraModels(ApplyServiceDto, ApplyServiceResponseDto)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers/services')
export class CustomerServicesController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List customer services (self)' })
  async list(@AuthUser() user: JwtPayload) {
    if (user.type !== 'customer') {
      return handleSuccessOne({ data: [], message: 'Forbidden' });
    }
    const data = await this.customersService.listServices(user.sub);
    return handleSuccessOne({ data, message: 'Services fetched' });
  }

  @Post('apply')
  @ApiOperation({
    summary: 'Apply for a service (with inline KYC if needed)',
    description:
      'Field requirements depend on service_type. See named examples. Enum sets: risk_tolerance=low|medium|high, employment_status=employed|self_employed|unemployed|retired|student, marital_status=single|married|divorced|widowed, document.doc_type=identity_front|identity_back|passport|bank_statement|address_proof|selfie',
  })
  @ApiBody({
    schema: { $ref: '#/components/schemas/ApplyServiceDto' },
    examples: {
      internationalStockAccount: {
        summary: 'International Stock Account (advanced)',
        value: {
          service_type: 'international_stock_account',
          kyc: {
            dob: '1988-03-21',
            nationality: 'TH',
            marital_status: 'single',
            employment_status: 'employed',
            annual_income: 62000,
            employer_name: 'Siam Finance Group',
            occupation: 'research_analyst',
            investment_experience: 6,
            source_of_funds: 'salary_savings',
            risk_tolerance: 'high',
            pep_flag: false,
            tax_id: 'TH-778812349',
            fatca_status: 'non_us_person',
          },
          address: {
            country_id: 'TH',
            province_id: 'TH-10',
            district_id: 'TH-10-05',
            village: 'Sukhumvit Soi 24',
            address_line: 'Condo 88/19, Floor 12',
            postal_code: '10110',
          },
          documents: [
            {
              doc_type: 'identity_front',
              storage_ref: 's3://kyc-docs/intl001/id-front.jpg',
            },
            {
              doc_type: 'identity_back',
              storage_ref: 's3://kyc-docs/intl001/id-back.jpg',
            },
            {
              doc_type: 'address_proof',
              storage_ref: 's3://kyc-docs/intl001/utility-may.pdf',
            },
          ],
        },
      },
      guaranteedReturns: {
        summary: 'Guaranteed Returns (highest tier)',
        value: {
          service_type: 'guaranteed_returns',
          kyc: {
            dob: '1979-09-09',
            nationality: 'LA',
            marital_status: 'married',
            employment_status: 'self_employed',
            annual_income: 150000,
            employer_name: 'Mekong Capital Partners',
            occupation: 'fund_manager',
            investment_experience: 12,
            source_of_funds: 'business_proceeds',
            risk_tolerance: 'medium',
            pep_flag: false,
            tax_id: 'LA-INV-559900',
            fatca_status: 'non_us_person',
          },
          address: {
            country_id: 'LA',
            province_id: 'LA-XA',
            district_id: 'LA-XA-03',
            village: 'Ban Sisavath',
            address_line: 'Villa 4, Riverside',
            postal_code: '15020',
          },
          documents: [
            {
              doc_type: 'identity_front',
              storage_ref: 's3://kyc-docs/gr001/id-front.png',
            },
            {
              doc_type: 'identity_back',
              storage_ref: 's3://kyc-docs/gr001/id-back.png',
            },
            {
              doc_type: 'bank_statement',
              storage_ref: 's3://kyc-docs/gr001/bank-statement-q2.pdf',
            },
            {
              doc_type: 'address_proof',
              storage_ref: 's3://kyc-docs/gr001/lease.pdf',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Service application processed (active or awaiting review).',
    schema: { $ref: '#/components/schemas/ApplyServiceResponseDto' },
    examples: {
      premiumActive: {
        summary: 'Premium active',
        value: {
          status: 'active',
          service_type: 'premium_membership',
          kyc_level: 'basic',
        },
      },
      intlAdvanced: {
        summary: 'International account active',
        value: {
          status: 'active',
          service_type: 'international_stock_account',
          kyc_level: 'advanced',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation or requirement failure',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
    examples: {
      missingDocs: {
        summary: 'Missing documents',
        value: {
          statusCode: 400,
          message: 'Missing required documents: identity_back, address_proof',
          error: 'Bad Request',
        },
      },
    },
  })
  async apply(
    @AuthUser() user: JwtPayload,
    @Body(ValidationPipe) dto: ApplyServiceDto,
  ) {
    if (user.type !== 'customer') {
      return handleSuccessOne({ data: null, message: 'Forbidden' });
    }
    const kycPayload: Partial<CustomerKyc> | undefined = dto.kyc
      ? {
          dob: dto.kyc.dob ? new Date(dto.kyc.dob) : undefined,
          nationality: dto.kyc.nationality,
          marital_status: dto.kyc.marital_status as MaritalStatus | undefined,
          employment_status: dto.kyc.employment_status as
            | EmploymentStatus
            | undefined,
          annual_income: dto.kyc.annual_income,
          employer_name: dto.kyc.employer_name,
          occupation: dto.kyc.occupation,
          investment_experience: dto.kyc.investment_experience,
          dependent_number: dto.kyc.dependent_number,
          source_of_funds: dto.kyc.source_of_funds,
          risk_tolerance: dto.kyc.risk_tolerance as RiskTolerance | undefined,
          pep_flag: dto.kyc.pep_flag,
          tax_id: dto.kyc.tax_id,
          fatca_status: dto.kyc.fatca_status,
        }
      : undefined;

    const result = await this.customersService.applyService(
      user.sub,
      dto.service_type,
      {
        kyc: kycPayload,
        address: dto.address,
        documents: dto.documents?.map((d) => ({
          doc_type: d.doc_type,
          storage_ref: d.storage_ref,
          checksum: d.checksum,
        })),
      },
    );
    const response: ApplyServiceResponseDto = {
      status: result.status,
      service_type: dto.service_type,
      kyc_level: (result.kyc && result.kyc.kyc_level) || undefined,
    };
    return handleSuccessOne({ data: response, message: 'Service processed' });
  }
}
