import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../common/interfaces';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  handleSuccessPaginated,
  handleSuccessOne,
} from '../../common/utils/response.util';

class ApprovePaymentDto {
  notes?: string;
}

class RejectPaymentDto {
  reason!: string;
}

class PaymentFilterDto extends PaginationQueryDto {
  status?: PaymentStatus;
  type?: string;
  customer_id?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  @Get()
  @UseGuards(JwtUserAuthGuard, PermissionsGuard)
  @Permissions('payments:read')
  @ApiOperation({ summary: 'List all payments (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: PaymentStatus })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'customer_id', required: false })
  async findAll(
    @Query() query: PaymentFilterDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can view all payments');
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.customer', 'customer')
      .leftJoinAndSelect(
        'payment.subscription_package',
        'subscription_package',
      );

    // Apply filters
    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('payment.payment_type = :type', { type: query.type });
    }

    if (query.customer_id) {
      qb.andWhere('payment.customer_id = :customer_id', {
        customer_id: query.customer_id,
      });
    }

    if (query.startDate) {
      qb.andWhere('payment.created_at >= :startDate', {
        startDate: query.startDate,
      });
    }

    if (query.endDate) {
      qb.andWhere('payment.created_at <= :endDate', { endDate: query.endDate });
    }

    // Search in customer fields if search provided
    if (query.search) {
      qb.andWhere(
        '(customer.first_name ILIKE :search OR customer.email ILIKE :search OR payment.payment_intent_id ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await qb
      .orderBy('payment.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit) || 1;

    return handleSuccessPaginated({
      data,
      total,
      page,
      limit,
      totalPages,
      message: 'Payments fetched successfully',
    });
  }

  @Get(':id')
  @UseGuards(JwtUserAuthGuard, PermissionsGuard)
  @Permissions('payments:read')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can view payment details');
    }

    const payment = await this.paymentRepo.findOne({
      where: { id },
      relations: ['customer', 'subscription_package', 'service'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return handleSuccessOne({
      data: payment,
      message: 'Payment found',
    });
  }

  @Post(':id/approve')
  @UseGuards(JwtUserAuthGuard, PermissionsGuard)
  @Permissions('payments:approve')
  @ApiOperation({ summary: 'Approve a payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiBody({ type: ApprovePaymentDto })
  @ApiResponse({ status: 200, description: 'Payment approved successfully' })
  async approvePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: ApprovePaymentDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can approve payments');
    }

    const payment = await this.paymentRepo.findOne({
      where: { id },
      relations: ['customer'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.PAYMENT_SLIP_SUBMITTED
    ) {
      throw new ForbiddenException(
        `Cannot approve payment with status: ${payment.status}`,
      );
    }

    payment.status = PaymentStatus.SUCCEEDED;
    payment.paid_at = new Date();
    payment.approved_by_admin_id = user.sub;
    payment.approved_at = new Date();
    if (dto.notes) {
      payment.admin_notes = dto.notes;
    }

    const updatedPayment = await this.paymentRepo.save(payment);

    return handleSuccessOne({
      data: updatedPayment,
      message: 'Payment approved successfully',
    });
  }

  @Post(':id/reject')
  @UseGuards(JwtUserAuthGuard, PermissionsGuard)
  @Permissions('payments:reject')
  @ApiOperation({ summary: 'Reject a payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiBody({ type: RejectPaymentDto })
  @ApiResponse({ status: 200, description: 'Payment rejected successfully' })
  async rejectPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: RejectPaymentDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can reject payments');
    }

    const payment = await this.paymentRepo.findOne({
      where: { id },
      relations: ['customer'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.PAYMENT_SLIP_SUBMITTED
    ) {
      throw new ForbiddenException(
        `Cannot reject payment with status: ${payment.status}`,
      );
    }

    payment.status = PaymentStatus.FAILED;
    payment.failed_at = new Date();
    payment.failure_reason = dto.reason;
    payment.approved_by_admin_id = user.sub;
    if (dto.reason) {
      payment.admin_notes = `Rejected: ${dto.reason}`;
    }

    const updatedPayment = await this.paymentRepo.save(payment);

    return handleSuccessOne({
      data: updatedPayment,
      message: 'Payment rejected successfully',
    });
  }
}
