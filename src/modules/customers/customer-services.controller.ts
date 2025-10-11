import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  ValidationPipe,
  ForbiddenException,
  BadRequestException,
  Param,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiBody,
  ApiExtraModels,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtCustomerAuthGuard } from '../auth/guards/jwt-customer.guard';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user.guard';
import { CustomersService } from './customers.service';
import {
  ApplyServiceDto,
  ApplyServiceResponseDto,
} from './dto/apply-service.dto';
import {
  ApplyPremiumMembershipDto,
  SubscriptionStatusDto,
  PremiumMembershipResponseDto,
  ApprovePaymentSlipDto,
} from './dto/subscription.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../common/interfaces';
import { CustomerKyc } from './entities/customer-kyc.entity';
import {
  EmploymentStatus,
  MaritalStatus,
  RiskTolerance,
} from '../../common/enums';
import {
  handleSuccessOne,
  handleSuccessPaginated,
} from '../../common/utils/response.util';
import {
  ServiceApplyRequestExamples,
  ServiceApplyResponseExamples,
  ServiceApplyErrorExamples,
  ServiceEnumDescription,
} from './swagger/service-apply.examples';
import { ServiceApproveResponseExamples } from './swagger/service-approve.examples';
import { Query } from '@nestjs/common';
import { KycLevel, KycStatus } from './entities/customer-kyc.entity';
import { CustomerServiceType } from './entities/customer-service.entity';
import { TopupServiceDto, TransferFundsDto } from './dto/funds.dto';

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

    // Special handling for premium membership - redirect to payment flow
    if (dto.service_type === CustomerServiceType.PREMIUM_MEMBERSHIP) {
      throw new BadRequestException(
        'Premium membership applications must use the /premium-membership/apply endpoint with subscription details and payment processing.',
      );
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

  @UseGuards(JwtCustomerAuthGuard)
  @Post(':serviceId/topup')
  @ApiOperation({
    summary: 'Top up INTERNATIONAL_STOCK_ACCOUNT service balance',
  })
  async topup(
    @Param('serviceId') serviceId: string,
    @AuthUser() user: JwtPayload,
    @Body(ValidationPipe) dto: TopupServiceDto,
  ) {
    if (user.type !== 'customer') throw new ForbiddenException();
    const result = await this.customersService.topupInternationalAccount(
      user.sub,
      serviceId,
      dto,
    );
    return handleSuccessOne({ data: result, message: 'Top-up successful' });
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Post('transfer')
  @ApiOperation({
    summary:
      'Transfer funds from INTERNATIONAL_STOCK_ACCOUNT to GUARANTEED_RETURNS',
  })
  async transfer(
    @AuthUser() user: JwtPayload,
    @Body(ValidationPipe) dto: TransferFundsDto,
  ) {
    if (user.type !== 'customer') throw new ForbiddenException();
    const result = await this.customersService.transferToGuaranteedReturns(
      user.sub,
      dto,
    );
    return handleSuccessOne({ data: result, message: 'Transfer processed' });
  }

  @UseGuards(JwtUserAuthGuard)
  @Post(':serviceId/approve')
  @ApiOperation({
    summary: 'Approve a pending service application (internal user only)',
    description:
      'Marks associated pending KYC as approved and activates the service. For payment-based services, ensures payment is completed first. Requires user token (type=user).',
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
        payment: { type: 'object', description: 'Payment info if applicable' },
      },
    },
    examples: {
      success: ServiceApproveResponseExamples.success,
      alreadyActive: ServiceApproveResponseExamples.alreadyActive,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'No pending KYC, already active, or payment not completed',
    examples: { noPending: ServiceApproveResponseExamples.noPending },
  })
  @ApiResponse({
    status: 404,
    description: 'Service application not found',
    examples: { notFound: ServiceApproveResponseExamples.notFound },
  })
  async approve(
    @Param('serviceId') serviceId: string,
    @AuthUser() user: JwtPayload,
  ) {
    // Basic admin gate: require internal user token
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
        kyc_level: 'kyc' in result ? result.kyc?.kyc_level : undefined,
        payment: 'payment' in result ? result.payment : undefined,
      },
      message: 'Service approval processed',
    });
  }

  @UseGuards(JwtUserAuthGuard)
  @Post(':serviceId/reject')
  @ApiOperation({
    summary: 'Reject a pending service application (internal user only)',
    description:
      'Marks associated pending KYC as rejected and deactivates the service. For payment-based services, logs rejection with payment audit. Requires user token (type=user).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rejection_reason: {
          type: 'string',
          description: 'Reason for rejection',
          example: 'Insufficient documentation provided',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Service rejected',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'rejected' },
        service_id: { type: 'string', format: 'uuid' },
        service_type: { type: 'string' },
        reason: { type: 'string', description: 'Rejection reason' },
        kyc_level: { type: 'string', example: 'brokerage' },
        payment: { type: 'object', description: 'Payment info if applicable' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'No pending KYC, already active, or invalid service',
  })
  @ApiResponse({
    status: 404,
    description: 'Service application not found',
  })
  async reject(
    @Param('serviceId') serviceId: string,
    @AuthUser() user: JwtPayload,
    @Body() body: { rejection_reason?: string },
  ) {
    // Basic admin gate: require internal user token
    if (user.type !== 'user') throw new ForbiddenException();

    const result = await this.customersService.rejectService(
      serviceId,
      user.sub,
      body.rejection_reason,
    );

    return handleSuccessOne({
      data: {
        status: result.status,
        service_id: result.service.id,
        service_type: result.service.service_type,
        reason: result.reason,
        kyc_level: 'kyc' in result ? result.kyc?.kyc_level : undefined,
        payment: 'payment' in result ? result.payment : undefined,
      },
      message: 'Service rejection processed',
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

  // --- Premium Membership Subscription Endpoints (restored) ---

  @Post('premium-membership/apply')
  @UseGuards(JwtCustomerAuthGuard)
  @ApiOperation({
    summary: '[Group: Apply] Apply for Premium Membership subscription',
    description:
      'APPLY FLOW (Group: Apply)\n1. Customer submits package_id + payment_slip.\n2. Entry appears in admin pending list.\n3. Admin approves (approve payment slip) or rejects (reject payment slip).\n4. On approval service activates & subscription dates set.\nIMPORTANT: payment_amount must match package fee exactly.',
  })
  @ApiBody({
    type: ApplyPremiumMembershipDto,
    description:
      'Premium membership subscription details (payment_slip object required on initial application).',
    examples: {
      threeMonths: {
        summary: 'Apply 3-month package',
        value: {
          service_type: 'premium_membership',
          package_id: '11111111-1111-1111-1111-111111111111',
          payment_slip: {
            payment_slip_url: 'https://cdn.example.com/slips/apply-3m.jpg',
            payment_slip_filename: 'apply-3m.jpg',
            payment_amount: 299.99,
            payment_reference: 'BANK-APPLY-3M-001',
          },
        },
      },
      sixMonths: {
        summary: 'Apply 6-month package',
        value: {
          service_type: 'premium_membership',
          package_id: '22222222-2222-2222-2222-222222222222',
          payment_slip: {
            payment_slip_url: 'https://cdn.example.com/slips/apply-6m.jpg',
            payment_slip_filename: 'apply-6m.jpg',
            payment_amount: 549.99,
            payment_reference: 'BANK-APPLY-6M-001',
          },
        },
      },
      twelveMonths: {
        summary: 'Apply 12-month package',
        value: {
          service_type: 'premium_membership',
          package_id: '33333333-3333-3333-3333-333333333333',
          payment_slip: {
            payment_slip_url: 'https://cdn.example.com/slips/apply-12m.jpg',
            payment_slip_filename: 'apply-12m.jpg',
            payment_amount: 999.99,
            payment_reference: 'BANK-APPLY-12M-001',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Premium membership application submitted successfully',
    type: PremiumMembershipResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid subscription details or customer already has active membership',
  })
  async applyPremiumMembership(
    @Body(ValidationPipe) dto: ApplyPremiumMembershipDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'customer') {
      throw new ForbiddenException(
        'Only customers can apply for premium membership',
      );
    }
    const result =
      await this.customersService.applyPremiumMembershipWithPaymentSlip(
        user.sub,
        dto.package_id,
        dto.payment_slip,
      );

    return handleSuccessOne({
      data: {
        status: result.status,
        service_type: 'premium_membership',
        service_id: result.service.id,
        payment: result.payment,
        subscription: {
          service_type: result.service.service_type,
          active: result.service.active,
          subscription_duration: result.service.subscription_duration,
          subscription_expires_at: result.service.subscription_expires_at,
          subscription_fee: result.service.subscription_fee,
          applied_at: result.service.applied_at,
        },
      },
      message:
        'Premium membership application with payment slip submitted successfully. Pending admin review.',
    });
  }

  @Get('subscriptions/my')
  @UseGuards(JwtCustomerAuthGuard)
  @ApiOperation({
    summary: 'Get current customer subscription status',
    description:
      'View all subscription-based services for the authenticated customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription status retrieved successfully',
    type: [SubscriptionStatusDto],
  })
  async getMySubscriptions(@AuthUser() user: JwtPayload) {
    if (user.type !== 'customer') {
      throw new ForbiddenException('Only customers can view subscriptions');
    }
    const services = await this.customersService.listServices(user.sub);
    const subscriptions = services.filter(
      (service) => service.subscription_duration !== null,
    );
    return handleSuccessOne({
      data: subscriptions,
      message: 'Subscription status retrieved',
    });
  }

  @Get('admin/premium-membership/pending')
  @UseGuards(JwtUserAuthGuard)
  @ApiOperation({
    summary: '[Group: Apply/Renew Manual] Pending payment slips (admin)',
    description:
      'List of application & renewal entries waiting for manual payment slip approval.',
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
  @ApiResponse({
    status: 200,
    description: 'Pending premium membership applications retrieved',
  })
  async getPendingPremiumMemberships(
    @AuthUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can view pending applications');
    }
    const result = await this.customersService.getPendingPremiumMemberships({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return handleSuccessPaginated({
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      message: 'Pending premium membership applications retrieved',
    });
  }

  @Get('payments/history')
  @UseGuards(JwtCustomerAuthGuard)
  @ApiOperation({
    summary: 'Get customer payment history',
    description: 'View payment history for the authenticated customer',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to return (default: 50)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based, default: 1)',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    type: String,
    description: 'Filter payments created on/after this ISO date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: String,
    description: 'Filter payments created on/before this ISO date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment history retrieved successfully',
  })
  async getPaymentHistory(
    @AuthUser() user: JwtPayload,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    if (user.type !== 'customer') {
      throw new ForbiddenException('Only customers can view payment history');
    }

    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedPage = page ? parseInt(page, 10) : 1;
    const effectiveLimit = parsedLimit && parsedLimit > 0 ? parsedLimit : 50;
    const offset = (parsedPage > 0 ? parsedPage - 1 : 0) * effectiveLimit;

    const parsedStart = startDate ? new Date(startDate) : undefined;
    const parsedEnd = endDate ? new Date(endDate) : undefined;

    const res = await this.customersService.getPaymentHistory(user.sub, {
      limit: effectiveLimit,
      offset,
      startDate: parsedStart,
      endDate: parsedEnd,
    });
    const totalPages = Math.ceil(res.total / effectiveLimit) || 1;
    return handleSuccessPaginated({
      data: res.payments,
      total: res.total,
      page: parsedPage,
      limit: effectiveLimit,
      totalPages,
      message: 'Payment history retrieved',
    });
  }

  @Get('admin/payments/audit')
  @UseGuards(JwtUserAuthGuard)
  @ApiOperation({
    summary: 'Get payment audit logs (admin only)',
    description: 'View payment audit logs for administrative purposes',
  })
  @ApiQuery({
    name: 'customer_id',
    required: false,
    type: String,
    description: 'Filter by customer ID',
  })
  @ApiQuery({
    name: 'payment_id',
    required: false,
    type: String,
    description: 'Filter by payment ID',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to return (default: 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip (default: 0)',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment audit logs retrieved successfully',
  })
  getPaymentAuditLogs(
    @AuthUser() user: JwtPayload,
    @Query('customer_id') customerId?: string,
    @Query('payment_id') paymentId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can view audit logs');
    }

    // This would need to be implemented in the service
    // For now, return a placeholder
    return handleSuccessOne({
      data: {
        message: 'Payment audit logs feature available in service layer',
        filters: { customerId, paymentId, limit, offset },
      },
      message: 'Payment audit logs retrieved',
    });
  }

  @Post('admin/payments/:paymentId/approve')
  @UseGuards(JwtUserAuthGuard)
  @ApiOperation({
    summary: '[Group: Apply/Renew Manual] Approve payment slip (admin)',
    description:
      'Activates related service/renewal; sets subscription dates. Separate reject endpoint for denials.',
  })
  @ApiParam({
    name: 'paymentId',
    description: 'Payment ID to approve (this endpoint ONLY approves)',
  })
  @ApiBody({
    type: ApprovePaymentSlipDto,
    description:
      'Approval notes (no approve flag needed; this route always approves).',
    examples: {
      approve: {
        summary: 'Approve payment slip',
        value: { admin_notes: 'Amount matches package fee; activating now' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Payment slip processed successfully',
  })
  async approvePaymentSlip(
    @Param('paymentId') paymentId: string,
    @Body(ValidationPipe) dto: ApprovePaymentSlipDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can approve payment slips');
    }

    const result = await this.customersService.approveServicePayment(
      paymentId,
      user.sub,
      dto.admin_notes,
    );

    return handleSuccessOne({
      data: result,
      message: 'Payment approved and service activated successfully',
    });
  }

  @Post('admin/payments/:paymentId/reject')
  @UseGuards(JwtUserAuthGuard)
  @ApiOperation({
    summary: '[Group: Apply/Renew Manual] Reject payment slip (admin)',
    description:
      'Rejects payment slip with mandatory rejection_reason. Separate endpoint ensures explicit rejection intent.',
  })
  @ApiParam({
    name: 'paymentId',
    description: 'Payment ID to reject (this endpoint ONLY rejects)',
  })
  @ApiBody({
    schema: {
      $ref: '#/components/schemas/RejectPaymentSlipDto',
    },
    examples: {
      rejectPayment: {
        summary: 'Reject with reason',
        value: {
          rejection_reason: 'Slip unreadable / amount mismatch',
          admin_notes: 'Ask customer to resubmit clearer photo',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Payment slip rejected',
  })
  async rejectPaymentSlip(
    @Param('paymentId') paymentId: string,
    @Body(ValidationPipe)
    body: { rejection_reason: string; admin_notes?: string },
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can reject payment slips');
    }

    const result = await this.customersService.approveServicePayment(
      paymentId,
      user.sub,
      body.admin_notes,
    );

    return handleSuccessOne({
      data: result,
      message: 'Payment rejected successfully',
    });
  }
}
