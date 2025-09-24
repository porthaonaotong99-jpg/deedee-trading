import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiBody,
  ApiExtraModels,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtCustomerAuthGuard } from '../auth/guards/jwt-customer.guard';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user.guard';
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
import {
  ServiceApplyRequestExamples,
  ServiceApplyResponseExamples,
  ServiceApplyErrorExamples,
  ServiceEnumDescription,
} from './swagger/service-apply.examples';
import { ServiceApproveResponseExamples } from './swagger/service-approve.examples';
import { Query } from '@nestjs/common';
import { KycLevel, KycStatus } from './entities/customer-kyc.entity';

@ApiTags('customer-services')
@ApiExtraModels(ApplyServiceDto, ApplyServiceResponseDto)
@ApiBearerAuth()
@Controller('customers/services')
export class CustomerServicesController {
  constructor(private readonly customersService: CustomersService) {}

  @UseGuards(JwtCustomerAuthGuard)
  @Get('list')
  @ApiOperation({ summary: 'List customer services (self)' })
  async list(@AuthUser() user: JwtPayload) {
    // Guard already enforces token type; extra check defensive only
    if (user.type !== 'customer') throw new ForbiddenException();
    const data = await this.customersService.listServices(user.sub);
    return handleSuccessOne({ data, message: 'Services fetched' });
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Post('apply')
  @ApiOperation({
    summary: 'Apply for a service (with inline KYC if needed)',
    description: `Field requirements depend on service_type. See named examples. ${ServiceEnumDescription}`,
  })
  @ApiBody({
    schema: { $ref: '#/components/schemas/ApplyServiceDto' },
    examples: ServiceApplyRequestExamples,
  })
  @ApiResponse({
    status: 200,
    description: 'Service application processed (active or awaiting review).',
    schema: { $ref: '#/components/schemas/ApplyServiceResponseDto' },
    examples: ServiceApplyResponseExamples,
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
    examples: ServiceApplyErrorExamples,
  })
  async apply(
    @AuthUser() user: JwtPayload,
    @Body(ValidationPipe) dto: ApplyServiceDto,
  ) {
    if (user.type !== 'customer') {
      throw new ForbiddenException();
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
      kyc_level:
        'kyc' in result && result.kyc ? result.kyc.kyc_level : undefined,
    };
    return handleSuccessOne({ data: response, message: 'Service processed' });
  }

  @UseGuards(JwtUserAuthGuard)
  @Post(':serviceId/approve')
  @ApiOperation({
    summary: 'Approve a pending service application (internal user only)',
    description:
      'Marks associated pending KYC as approved and activates the service. Requires user token (type=user).',
  })
  @ApiResponse({
    status: 200,
    description: 'Service approved and activated',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'activated' },
        service_id: { type: 'string', format: 'uuid' },
        service_type: { type: 'string' },
        kyc_level: { type: 'string', example: 'brokerage' },
      },
    },
    examples: {
      success: ServiceApproveResponseExamples.success,
      alreadyActive: ServiceApproveResponseExamples.alreadyActive,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'No pending KYC or already active',
    examples: { noPending: ServiceApproveResponseExamples.noPending },
  })
  @ApiResponse({
    status: 404,
    description: 'Service application not found',
    examples: { notFound: ServiceApproveResponseExamples.notFound },
  })
  async approve(
    @AuthUser() user: JwtPayload,
    @Body('serviceId') serviceId: string,
  ) {
    // Basic admin gate: require internal user token AND roleId placeholder (could be replaced with RBAC later)
    if (user.type !== 'user') throw new ForbiddenException();
    const result = await this.customersService.approveService(
      serviceId,
      user.sub,
    );
    return handleSuccessOne({
      data: {
        status: result.status,
        service_id: result.service.id,
        service_type: result.service.service_type,
        kyc_level: result.kyc?.kyc_level,
      },
      message: 'Service approval processed',
    });
  }

  @UseGuards(JwtUserAuthGuard)
  @Get('admin/kyc')
  @ApiOperation({
    summary: 'List customer KYC records (admin)',
    description:
      'Paginated list with optional filters: status, level, customer_id.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based, default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Page size (default 20, max 100)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'KYC status filter',
    enum: KycStatus,
  })
  @ApiQuery({
    name: 'level',
    required: false,
    description:
      'KYC level filter: accepts basic|advanced|brokerage or numeric 1=basic,2=advanced,3=brokerage',
  })
  @ApiQuery({
    name: 'customer_id',
    required: false,
    type: String,
    description: 'Filter by specific customer UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'KYC records fetched',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async listKyc(
    @AuthUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: KycStatus,
    @Query('level') level?: string,
    @Query('customer_id') customer_id?: string,
  ) {
    if (user.type !== 'user') throw new ForbiddenException();
    let mappedLevel: KycLevel | undefined;
    if (level) {
      if (level === 'basic' || level === 'advanced' || level === 'brokerage') {
        mappedLevel = level as KycLevel;
      } else if (/^\d+$/.test(level)) {
        const num = parseInt(level, 10);
        if (num === 1) mappedLevel = KycLevel.BASIC;
        else if (num === 2) mappedLevel = KycLevel.ADVANCED;
        else if (num === 3) mappedLevel = KycLevel.BROKERAGE;
      }
    }
    const result = await this.customersService.listKyc({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      level: mappedLevel,
      customer_id,
    });
    return handleSuccessOne({ data: result, message: 'KYC records fetched' });
  }
}
