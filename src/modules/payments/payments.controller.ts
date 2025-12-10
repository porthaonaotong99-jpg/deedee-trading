import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiParam,
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
}
