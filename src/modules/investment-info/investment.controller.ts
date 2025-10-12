import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiExtraModels,
} from '@nestjs/swagger';
import { InterestTierService } from './interest-tier.service';
import { JwtCustomerAuthGuard } from '../auth/guards/jwt-customer.guard';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../common/interfaces';
import {
  CreateInvestmentRequestDto,
  CreateReturnRequestDto,
  ApproveInvestmentDto,
  ApproveReturnDto,
  InvestmentRequestResponse,
  InterestRateCalculationResponse,
  CalculateRateDto,
} from './dto/investment-api.dto';
import {
  handleSuccessOne,
  handleSuccessPaginated,
} from '../../common/utils/response.util';
import { InvestmentService } from './updated-investment.service';
// transaction enums are no longer used here; logic moved to service

@ApiTags('investment-requests')
@ApiExtraModels(
  CreateInvestmentRequestDto,
  CreateReturnRequestDto,
  ApproveInvestmentDto,
  ApproveReturnDto,
  InvestmentRequestResponse,
  InterestRateCalculationResponse,
)
@ApiBearerAuth()
@Controller('investment-requests')
export class NewInvestmentController {
  constructor(
    private readonly investmentService: InvestmentService,
    private readonly tierService: InterestTierService,
  ) {}

  // === CUSTOMER ENDPOINTS ===

  @UseGuards(JwtCustomerAuthGuard)
  @Post()
  @ApiOperation({
    summary: 'Submit investment request with payment slip',
    description:
      'Customer submits a new investment request with payment slip. Interest rate is automatically calculated based on investment amount and risk tolerance.',
  })
  @ApiBody({
    type: CreateInvestmentRequestDto,
    description: 'Investment request details',
    examples: {
      bronzeLowRisk: {
        summary: 'Bronze Tier - Low Risk',
        description: 'Small investment with conservative risk preference',
        value: {
          amount: 15000,
          payment_slip_url:
            'https://storage.example.com/payment-slips/slip-123.jpg',
          payment_date: '2025-10-12T10:30:00Z',
          customer_notes: 'First time investment, looking for stable returns',
          requested_investment_period: '12 months',
          requested_risk_tolerance: 'low',
          requested_investment_goal: 'Steady growth with capital preservation',
        },
      },
      silverMediumRisk: {
        summary: 'Silver Tier - Medium Risk',
        description: 'Medium investment with moderate risk preference',
        value: {
          amount: 75000,
          payment_slip_url:
            'https://storage.example.com/payment-slips/slip-456.jpg',
          payment_date: '2025-10-12T14:20:00Z',
          customer_notes: 'Retirement savings with balanced approach',
          requested_investment_period: '24 months',
          requested_risk_tolerance: 'medium',
          requested_investment_goal: 'Balanced growth and income generation',
        },
      },
      goldHighRisk: {
        summary: 'Gold Tier - High Risk',
        description: 'Large investment with aggressive risk preference',
        value: {
          amount: 150000,
          payment_slip_url:
            'https://storage.example.com/payment-slips/slip-789.jpg',
          payment_date: '2025-10-12T16:45:00Z',
          customer_notes:
            'Seeking maximum returns for long-term wealth building',
          requested_investment_period: '36 months',
          requested_risk_tolerance: 'high',
          requested_investment_goal:
            'Aggressive growth for wealth accumulation',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Investment request created successfully with calculated interest rate',
    type: InvestmentRequestResponse,
    example: {
      request_id: 'request-uuid-123',
      status: 'pending_admin_review',
      calculated_tier: 'silver',
      calculated_interest_rate: 0.19,
      risk_tolerance: 'medium',
      base_rate: 0.15,
      risk_adjustment: 0.04,
      tier_description:
        'SILVER Tier (MEDIUM Risk): $50,000 - $99,999 → 19.0% returns',
      message:
        'Investment request submitted successfully. SILVER Tier (MEDIUM Risk): $50,000 - $99,999 → 19.0% returns',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or amount below minimum',
  })
  @ApiResponse({ status: 404, description: 'Service not found or inactive' })
  async createInvestmentRequest(
    @Body(ValidationPipe) dto: CreateInvestmentRequestDto,
    @AuthUser() user: JwtPayload,
  ) {
    // Guard already enforces token type; extra check defensive only
    if (user.type !== 'customer') {
      throw new ForbiddenException(
        'Only customers can submit investment requests',
      );
    }

    const result = await this.investmentService.createInvestmentRequest({
      ...dto,
      customer_id: user.sub, // Use authenticated user ID
    });

    return handleSuccessOne({
      data: result,
      message: 'Investment request submitted successfully',
    });
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Get('my-summary')
  @ApiOperation({
    summary: 'Get customer investment summary',
    description: 'View investment summary for the authenticated customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Investment summary retrieved successfully',
  })
  async getMyInvestmentSummary(@AuthUser() user: JwtPayload) {
    if (user.type !== 'customer') {
      throw new ForbiddenException(
        'Only customers can view their investment summary',
      );
    }

    const summary = await this.investmentService.getCustomerSummaryForCustomer(
      user.sub,
    );
    return handleSuccessOne({
      data: summary,
      message: 'Investment summary retrieved successfully',
    });
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Get('my-transactions')
  @ApiOperation({
    summary: 'Get customer transaction history',
    description: 'View transaction history for the authenticated customer',
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
    name: 'start_date',
    required: false,
    type: String,
    description: 'Filter start datetime (ISO 8601)',
    example: '2025-10-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: String,
    description: 'Filter end datetime (ISO 8601)',
    example: '2025-10-31T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction history retrieved successfully (paginated)',
    schema: {
      type: 'object',
      properties: {
        is_error: { type: 'boolean', example: false },
        code: { type: 'string', example: 'SUCCESS' },
        message: {
          type: 'string',
          example: 'Transaction history retrieved successfully',
        },
        data: {
          type: 'array',
          items: { type: 'object' },
          example: [
            {
              id: '#INV-ABC123',
              amountInvested: '$75,000.00',
              investDate: 'October 12, 2025',
              duration: '24 months',
              maturityDate: 'October 12, 2027',
              totalProfit: '$28,500.00',
              status: 'Active',
              returnRate: '19.0%',
            },
          ],
        },
        total: { type: 'number', example: 42 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        totalPages: { type: 'number', example: 3 },
        error: { type: 'object', nullable: true, example: null },
        status_code: { type: 'number', example: 200 },
      },
    },
  })
  async getMyTransactions(
    @AuthUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('start_date') startDateStr?: string,
    @Query('end_date') endDateStr?: string,
  ) {
    if (user.type !== 'customer') {
      throw new ForbiddenException(
        'Only customers can view their transactions',
      );
    }

    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (startDateStr) {
      const d = new Date(startDateStr);
      if (!isNaN(d.getTime())) startDate = d;
    }
    if (endDateStr) {
      const d = new Date(endDateStr);
      if (!isNaN(d.getTime())) endDate = d;
    }
    const {
      data: view,
      total,
      page: p2,
      limit: l2,
      totalPages,
    } = await this.investmentService.getCustomerTransactionsViewPaginated(
      user.sub,
      p,
      l,
      startDate,
      endDate,
    );
    return handleSuccessPaginated({
      data: view,
      total,
      page: p2,
      limit: l2,
      totalPages,
      message: 'Transaction history retrieved successfully',
    });
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Post('return-request')
  @ApiOperation({
    summary: 'Create return request',
    description:
      'Customer submits a request to return investment principal or interest',
  })
  @ApiBody({
    type: CreateReturnRequestDto,
    description: 'Return request details',
  })
  @ApiResponse({
    status: 200,
    description: 'Return request created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid return request data or insufficient funds',
  })
  async createReturnRequest(
    @Body(ValidationPipe) dto: CreateReturnRequestDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'customer') {
      throw new ForbiddenException('Only customers can create return requests');
    }

    const result = await this.investmentService.createReturnRequest({
      ...dto,
      customer_id: user.sub,
    });

    return handleSuccessOne({
      data: result,
      message: 'Return request submitted successfully',
    });
  }

  // === ADMIN ENDPOINTS ===

  @UseGuards(JwtUserAuthGuard)
  @Get('admin/pending')
  @ApiOperation({
    summary: 'List pending investment requests (Admin)',
    description: 'View all pending investment requests for admin review',
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
    name: 'start_date',
    required: false,
    type: String,
    description: 'Filter start datetime (ISO 8601)',
    example: '2025-10-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: String,
    description: 'Filter end datetime (ISO 8601)',
    example: '2025-10-31T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description:
      'Pending investment requests retrieved successfully (paginated)',
    schema: {
      type: 'object',
      properties: {
        is_error: { type: 'boolean', example: false },
        code: { type: 'string', example: 'SUCCESS' },
        message: {
          type: 'string',
          example: 'Pending investment requests retrieved successfully',
        },
        data: {
          type: 'array',
          items: { type: 'object' },
          example: [
            {
              id: 'req-uuid-1',
              customer_id: 'cust-uuid-1',
              amount: '75000.00',
              status: 'PENDING',
              calculated_tier: 'silver',
              calculated_interest_rate: '0.19',
              created_at: '2025-10-12T14:20:00.000Z',
            },
          ],
        },
        total: { type: 'number', example: 7 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        totalPages: { type: 'number', example: 1 },
        error: { type: 'object', nullable: true, example: null },
        status_code: { type: 'number', example: 200 },
      },
    },
  })
  async listPendingRequests(
    @AuthUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('start_date') startDateStr?: string,
    @Query('end_date') endDateStr?: string,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can view pending requests');
    }

    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (startDateStr) {
      const d = new Date(startDateStr);
      if (!isNaN(d.getTime())) startDate = d;
    }
    if (endDateStr) {
      const d = new Date(endDateStr);
      if (!isNaN(d.getTime())) endDate = d;
    }
    const { data, total, totalPages } =
      await this.investmentService.listPendingRequestsPaginated(
        p,
        l,
        startDate,
        endDate,
      );
    return handleSuccessPaginated({
      data,
      total,
      page: p,
      limit: l,
      totalPages,
      message: 'Pending investment requests retrieved successfully',
    });
  }

  @UseGuards(JwtUserAuthGuard)
  @Put('admin/:id/approve')
  @ApiOperation({
    summary: 'Approve investment request (Admin)',
    description:
      "Admin approves a pending investment request and creates the investment. The interest rate and term are derived from the customer's request and current interest_rate_configurations. The only input allowed is optional admin_notes.",
  })
  @ApiParam({
    name: 'id',
    description: 'Investment request ID',
    type: 'string',
  })
  @ApiBody({
    type: ApproveInvestmentDto,
    description: 'Investment approval details (admin_notes only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Investment request approved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid approval data or request already processed',
  })
  @ApiResponse({
    status: 404,
    description: 'Investment request not found',
  })
  async approveInvestmentRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: ApproveInvestmentDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException(
        'Only admins can approve investment requests',
      );
    }

    const result = await this.investmentService.approveInvestmentRequest(
      id,
      user.sub,
      dto,
    );

    return handleSuccessOne({
      data: result,
      message: 'Investment request approved successfully',
    });
  }

  @UseGuards(JwtUserAuthGuard)
  @Get('admin/pending-returns')
  @ApiOperation({
    summary: 'List pending return requests (Admin)',
    description: 'View all pending return requests for admin review',
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
    name: 'start_date',
    required: false,
    type: String,
    description: 'Filter start datetime (ISO 8601)',
    example: '2025-10-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: String,
    description: 'Filter end datetime (ISO 8601)',
    example: '2025-10-31T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending return requests retrieved successfully (paginated)',
    schema: {
      type: 'object',
      properties: {
        is_error: { type: 'boolean', example: false },
        code: { type: 'string', example: 'SUCCESS' },
        message: {
          type: 'string',
          example: 'Pending return requests retrieved successfully',
        },
        data: {
          type: 'array',
          items: { type: 'object' },
          example: [
            {
              id: 'txn-uuid-ret-1',
              transaction_type: 'RETURN_REQUEST',
              return_request_status: 'PENDING',
              amount: '5000.00',
              return_request_type: 'PRINCIPAL',
              created_at: '2025-10-12T16:00:00.000Z',
            },
          ],
        },
        total: { type: 'number', example: 3 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        totalPages: { type: 'number', example: 1 },
        error: { type: 'object', nullable: true, example: null },
        status_code: { type: 'number', example: 200 },
      },
    },
  })
  async listPendingReturns(
    @AuthUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('start_date') startDateStr?: string,
    @Query('end_date') endDateStr?: string,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can view pending returns');
    }

    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (startDateStr) {
      const d = new Date(startDateStr);
      if (!isNaN(d.getTime())) startDate = d;
    }
    if (endDateStr) {
      const d = new Date(endDateStr);
      if (!isNaN(d.getTime())) endDate = d;
    }
    const { data, total, totalPages } =
      await this.investmentService.listPendingReturnsPaginated(
        p,
        l,
        startDate,
        endDate,
      );
    return handleSuccessPaginated({
      data,
      total,
      page: p,
      limit: l,
      totalPages,
      message: 'Pending return requests retrieved successfully',
    });
  }

  @UseGuards(JwtUserAuthGuard)
  @Put('admin/returns/:id/approve')
  @ApiOperation({
    summary: 'Approve return request (Admin)',
    description:
      'Admin approves a pending return request and processes the payment',
  })
  @ApiParam({
    name: 'id',
    description: 'Return request transaction ID',
    type: 'string',
  })
  @ApiBody({
    type: ApproveReturnDto,
    description: 'Return approval details including payment method',
  })
  @ApiResponse({
    status: 200,
    description: 'Return request approved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid approval data or insufficient funds',
  })
  @ApiResponse({
    status: 404,
    description: 'Return request not found',
  })
  async approveReturnRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: ApproveReturnDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can approve return requests');
    }

    const result = await this.investmentService.approveReturnRequest(
      id,
      user.sub,
      dto,
    );

    return handleSuccessOne({
      data: result,
      message: 'Return request approved successfully',
    });
  }

  @UseGuards(JwtUserAuthGuard)
  @Put('admin/returns/:id/mark-paid')
  @ApiOperation({
    summary: 'Mark return as paid (Admin)',
    description: 'Admin marks an approved return request as paid/completed',
  })
  @ApiParam({
    name: 'id',
    description: 'Return request transaction ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Return marked as paid successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Return request not in approved status',
  })
  @ApiResponse({
    status: 404,
    description: 'Return request not found',
  })
  async markReturnAsPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can mark returns as paid');
    }

    const result = await this.investmentService.markReturnAsPaid(id, user.sub);

    return handleSuccessOne({
      data: result,
      message: 'Return marked as paid successfully',
    });
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Get('interest-tiers')
  @ApiOperation({
    summary: 'Get current interest rate tiers',
    description: 'View available interest rate tiers and requirements',
  })
  @ApiResponse({
    status: 200,
    description: 'Interest rate tiers retrieved successfully',
  })
  getInterestTiers() {
    const data = {
      tiers: [
        {
          name: 'Bronze',
          min_amount: 10000,
          max_amount: 49999,
          interest_rate: 0.15,
          description: 'Bronze tier - 15% annual returns',
        },
        {
          name: 'Silver',
          min_amount: 50000,
          max_amount: 99999,
          interest_rate: 0.18,
          description: 'Silver tier - 18% annual returns',
        },
        {
          name: 'Gold',
          min_amount: 100000,
          max_amount: null,
          interest_rate: 0.2,
          description: 'Gold tier - 20% annual returns',
        },
      ],
    };

    return handleSuccessOne({
      data,
      message: 'Interest rate tiers retrieved successfully',
    });
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Post('calculate-tier')
  @ApiOperation({
    summary: 'Calculate tier for investment amount',
    description:
      'Calculate which interest tier applies to a given investment amount',
  })
  @ApiBody({
    type: CalculateRateDto,
    description: 'Investment amount and risk tolerance for tier calculation',
  })
  @ApiResponse({
    status: 200,
    description: 'Tier calculation completed successfully',
    type: InterestRateCalculationResponse,
  })
  calculateTier(
    @Body(ValidationPipe) body: CalculateRateDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'customer') {
      throw new ForbiddenException('Only customers can calculate tiers');
    }

    const tierInfo = InterestTierService.calculateTierForAmount(body.amount);
    const allTiers = InterestTierService.formatTierInfo();
    const data = {
      calculated_tier: tierInfo,
      all_tiers: allTiers,
      is_qualified: InterestTierService.isAmountQualified(body.amount),
    };

    return handleSuccessOne({
      data,
      message: 'Tier calculation completed successfully',
    });
  }
}
