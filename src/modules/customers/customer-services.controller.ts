import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Apply for a service (with inline KYC if needed)' })
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
