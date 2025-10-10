import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan, Not } from 'typeorm';
import { StockPick } from '../entities/stock-pick.entity';
import {
  CustomerStockPick,
  CustomerPickStatus,
} from '../entities/customer-stock-pick.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { CustomerService } from '../../customers/entities/customer-service.entity';
import {
  CreateStockPickDto,
  UpdateStockPickDto,
  StockPickFilterDto,
  CustomerSubmitPaymentSlipDto,
  AdminApprovePickDto,
  StockPickResponseDto,
  CustomerStockPickResponseDto,
  CustomerViewStockPickDto,
} from '../dto/stock-picks.dto';
import {
  PaginationUtil,
  PaginatedResult,
} from '../../../common/utils/pagination.util';

import { NodemailerEmailService } from './email.service';

export interface StockPickEmailData {
  to: string;
  customerName: string;
  stockSymbol: string;
  description: string;
  adminResponse: string;
  targetPrice?: number;
  currentPrice?: number;
}

@Injectable()
export class StockPicksService {
  constructor(
    @InjectRepository(StockPick)
    private readonly stockPickRepo: Repository<StockPick>,
    @InjectRepository(CustomerStockPick)
    private readonly customerPickRepo: Repository<CustomerStockPick>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(CustomerService)
    private readonly customerServiceRepo: Repository<CustomerService>,
    private readonly dataSource: DataSource,
    private readonly emailService: NodemailerEmailService,
  ) {}

  // Admin methods
  async createStockPick(
    createDto: CreateStockPickDto,
    adminUserId: string,
  ): Promise<StockPickResponseDto> {
    const stockPick = this.stockPickRepo.create({
      ...createDto,
      created_by_admin_id: adminUserId,
      expires_at: createDto.expires_at ? new Date(createDto.expires_at) : null,
    });

    const savedPick = await this.stockPickRepo.save(stockPick);
    return this.mapToResponseDto(savedPick);
  }

  async getAllStockPicks(
    filterDto: StockPickFilterDto,
  ): Promise<PaginatedResult<StockPickResponseDto>> {
    const { page, limit, skip } = PaginationUtil.calculatePagination({
      page: filterDto.page,
      limit: filterDto.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });

    const queryBuilder = this.stockPickRepo.createQueryBuilder('pick');

    // Apply filters
    if (filterDto.service_type) {
      queryBuilder.andWhere('pick.service_type = :serviceType', {
        serviceType: filterDto.service_type,
      });
    }
    if (filterDto.status) {
      queryBuilder.andWhere('pick.status = :status', {
        status: filterDto.status,
      });
    }
    if (filterDto.availability) {
      queryBuilder.andWhere('pick.availability = :availability', {
        availability: filterDto.availability,
      });
    }
    if (filterDto.is_active !== undefined) {
      queryBuilder.andWhere('pick.is_active = :isActive', {
        isActive: filterDto.is_active,
      });
    }

    queryBuilder.orderBy('pick.created_at', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    const mappedData = data.map((pick) => this.mapToResponseDto(pick));

    return PaginationUtil.createPaginatedResult(mappedData, total, {
      page,
      limit,
    });
  }

  async updateStockPick(
    pickId: string,
    updateDto: UpdateStockPickDto,
  ): Promise<StockPickResponseDto> {
    const existingPick = await this.stockPickRepo.findOne({
      where: { id: pickId },
    });

    if (!existingPick) {
      throw new NotFoundException('Stock pick not found');
    }

    const updateData = {
      ...updateDto,
      expires_at: updateDto.expires_at
        ? new Date(updateDto.expires_at)
        : existingPick.expires_at,
    };

    await this.stockPickRepo.update(pickId, updateData);

    const updatedPick = await this.stockPickRepo.findOne({
      where: { id: pickId },
    });

    return this.mapToResponseDto(updatedPick!);
  }

  async deleteStockPick(pickId: string): Promise<void> {
    const result = await this.stockPickRepo.delete(pickId);
    if (result.affected === 0) {
      throw new NotFoundException('Stock pick not found');
    }
  }

  // Customer methods
  async getAvailablePicksForCustomer(
    customerId: string,
    filterDto: StockPickFilterDto,
  ): Promise<PaginatedResult<CustomerViewStockPickDto>> {
    const { page, limit, skip } = PaginationUtil.calculatePagination({
      page: filterDto.page,
      limit: filterDto.limit,
      defaultLimit: 10,
      maxLimit: 50,
    });

    const queryBuilder = this.stockPickRepo.createQueryBuilder('pick');

    // Apply filters if provided
    if (filterDto.availability) {
      queryBuilder.andWhere('pick.availability = :availability', {
        availability: filterDto.availability,
      });
    }

    if (filterDto.is_active !== undefined) {
      queryBuilder.andWhere('pick.is_active = :isActive', {
        isActive: filterDto.is_active,
      });
    }

    // Exclude expired picks
    queryBuilder.andWhere(
      '(pick.expires_at IS NULL OR pick.expires_at > :now)',
      { now: new Date() },
    );

    // Apply optional customer filters (risk, sector, expected return range, time horizon)
    if (filterDto.risk_level) {
      queryBuilder.andWhere('pick.risk_level = :riskLevel', {
        riskLevel: filterDto.risk_level,
      });
    }
    if (filterDto.sector) {
      queryBuilder.andWhere('LOWER(pick.sector) = LOWER(:sector)', {
        sector: filterDto.sector,
      });
    }
    // Percent overlap logic: ranges overlap if minA <= maxB AND maxA >= minB
    if (
      filterDto.min_expected_return_percent !== undefined ||
      filterDto.max_expected_return_percent !== undefined
    ) {
      const minPct =
        filterDto.min_expected_return_percent ?? Number.NEGATIVE_INFINITY;
      const maxPct =
        filterDto.max_expected_return_percent ?? Number.POSITIVE_INFINITY;
      // Only apply when we have at least one bound
      queryBuilder.andWhere(
        '((pick.expected_return_min_percent IS NULL AND pick.expected_return_max_percent IS NULL) OR (pick.expected_return_min_percent <= :maxPct AND pick.expected_return_max_percent >= :minPct))',
        { minPct, maxPct },
      );
    }
    // Time horizon overlap logic similar to percent
    if (
      filterDto.min_time_horizon_months !== undefined ||
      filterDto.max_time_horizon_months !== undefined
    ) {
      const minMonths =
        filterDto.min_time_horizon_months ?? Number.NEGATIVE_INFINITY;
      const maxMonths =
        filterDto.max_time_horizon_months ?? Number.POSITIVE_INFINITY;
      queryBuilder.andWhere(
        '((pick.time_horizon_min_months IS NULL AND pick.time_horizon_max_months IS NULL) OR (pick.time_horizon_min_months <= :maxMonths AND pick.time_horizon_max_months >= :minMonths))',
        { minMonths, maxMonths },
      );
    }

    queryBuilder.orderBy('pick.created_at', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Fetch customer's non-rejected selections for quick lookup
    const customerSelections = await this.customerPickRepo.find({
      where: { customer_id: customerId },
      select: ['stock_pick_id', 'status'],
    });
    const selectedSet = new Set(
      customerSelections
        .filter((s) => s.status !== CustomerPickStatus.REJECTED)
        .map((s) => s.stock_pick_id),
    );

    const mappedData = data.map((pick) =>
      this.mapToCustomerViewDto(pick, selectedSet.has(pick.id)),
    );

    return PaginationUtil.createPaginatedResult(mappedData, total, {
      page,
      limit,
    });
  }

  async getCustomerSelections(
    customerId: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResult<CustomerStockPickResponseDto>> {
    const {
      page: validPage,
      limit: validLimit,
      skip,
    } = PaginationUtil.calculatePagination({
      page,
      limit,
      defaultLimit: 10,
      maxLimit: 50,
    });

    const [data, total] = await this.customerPickRepo.findAndCount({
      where: { customer_id: customerId },
      order: { selected_at: 'DESC' },
      skip,
      take: validLimit,
      relations: ['stock_pick'],
    });

    const mappedData = data.map((pick) =>
      this.mapToCustomerPickResponseDto(pick),
    );

    return PaginationUtil.createPaginatedResult(mappedData, total, {
      page: validPage,
      limit: validLimit,
    });
  }

  // Payment slip methods
  async submitPaymentSlip(
    customerId: string,
    stockPickId: string,
    paymentSlipDto: CustomerSubmitPaymentSlipDto,
  ): Promise<CustomerStockPickResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const stockPickRepo = manager.getRepository(StockPick);
      const customerPickRepo = manager.getRepository(CustomerStockPick);

      // 1. Validate stock pick exists & is active / not expired
      const stockPick = await stockPickRepo.findOne({
        where: {
          id: stockPickId,
          is_active: true,
          expires_at: MoreThan(new Date()),
        },
      });
      if (!stockPick) {
        throw new NotFoundException('Stock pick not found');
      }
      if (!stockPick.is_active) {
        throw new BadRequestException('Stock pick is not active');
      }
      if (stockPick.expires_at && stockPick.expires_at <= new Date()) {
        throw new BadRequestException('Stock pick has expired');
      }

      // 2. Enforce single submission per customer per stock pick (pending or approved etc.)
      const existing = await customerPickRepo.findOne({
        where: {
          customer_id: customerId,
          stock_pick_id: stockPickId,
          status: Not(CustomerPickStatus.REJECTED),
        },
      });
      if (existing) {
        throw new BadRequestException(
          'You already submitted for this stock pick',
        );
      }

      // 3. Create new CustomerStockPick with payment slip data
      const pickEntity = customerPickRepo.create({
        customer_id: customerId,
        stock_pick_id: stockPickId,
        status: CustomerPickStatus.PAYMENT_SUBMITTED,
        payment_slip_url: paymentSlipDto.payment_slip_url,
        payment_slip_filename: paymentSlipDto.payment_slip_filename,
        payment_amount: paymentSlipDto.payment_amount,
        payment_reference: paymentSlipDto.payment_reference || null,
        customer_notes: paymentSlipDto.payment_notes || null,
        payment_submitted_at: new Date(),
        selected_at: new Date(),
      });
      const saved = await customerPickRepo.save(pickEntity);

      // 4. Reload with relations for response shaping (symbol hidden until approved logic is preserved)
      const full = await customerPickRepo.findOne({
        where: { id: saved.id },
        relations: ['stock_pick'],
      });

      return this.mapToCustomerPickResponseDto(full!);
    });
  }

  // Admin approval methods

  async getPendingApprovals(
    page = 1,
    limit = 20,
  ): Promise<
    PaginatedResult<
      CustomerStockPickResponseDto & {
        customer_email: string;
        customer_name: string;
        stock_symbol: string;
      }
    >
  > {
    const {
      page: validPage,
      limit: validLimit,
      skip,
    } = PaginationUtil.calculatePagination({
      page,
      limit,
      defaultLimit: 20,
      maxLimit: 100,
    });

    const queryBuilder = this.customerPickRepo
      .createQueryBuilder('cp')
      .leftJoinAndSelect('cp.stock_pick', 'sp')
      .leftJoinAndSelect('cp.customer', 'c')
      .where('cp.status = :status', {
        status: CustomerPickStatus.PAYMENT_SUBMITTED,
      })
      .orderBy('cp.payment_submitted_at', 'ASC')
      .skip(skip)
      .take(validLimit);

    const [data, total] = await queryBuilder.getManyAndCount();

    const mappedData: Array<
      CustomerStockPickResponseDto & {
        customer_email: string;
        customer_name: string;
        stock_symbol: string;
      }
    > = data.map((pick) => ({
      ...this.mapToCustomerPickResponseDto(pick),
      customer_email: pick.customer.email,
      customer_name: `${pick.customer.first_name} ${pick.customer.last_name}`,
      stock_symbol: pick.stock_pick.stock_symbol,
    }));

    return PaginationUtil.createPaginatedResult(mappedData, total, {
      page: validPage,
      limit: validLimit,
    });
  }

  async approveCustomerPick(
    customerPickId: string,
    adminUserId: string,
    approveDto: AdminApprovePickDto,
  ): Promise<CustomerStockPickResponseDto> {
    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const customerPickRepo =
          transactionalEntityManager.getRepository(CustomerStockPick);

        const customerPick = await customerPickRepo.findOne({
          where: { id: customerPickId },
          relations: ['customer', 'stock_pick'],
        });

        if (!customerPick) {
          throw new NotFoundException('Customer pick not found');
        }

        if (customerPick.status !== CustomerPickStatus.PAYMENT_SUBMITTED) {
          throw new BadRequestException(
            'Customer pick can only be approved after payment submission',
          );
        }

        const newStatus =
          approveDto.approve !== false
            ? CustomerPickStatus.APPROVED
            : CustomerPickStatus.REJECTED;

        // Update the customer pick
        await customerPickRepo.update(customerPickId, {
          status: newStatus,
          admin_response: approveDto.admin_response,
          approved_by_admin_id: adminUserId,
          approved_at: new Date(),
        });

        const updatedPick = await customerPickRepo.findOne({
          where: { id: customerPickId },
          relations: ['customer', 'stock_pick'],
        });

        // Send email notifications
        if (newStatus === CustomerPickStatus.APPROVED) {
          await this.sendStockPickEmail(updatedPick!);
        } else if (newStatus === CustomerPickStatus.REJECTED) {
          await this.sendRejectionEmail(updatedPick!);
        }

        return this.mapToCustomerPickResponseDto(updatedPick!);
      },
    );
  }

  private async sendStockPickEmail(
    customerPick: CustomerStockPick,
  ): Promise<void> {
    try {
      const emailHtml = `
        <h2>Your Stock Pick Has Been Approved!</h2>
        <p>Dear ${customerPick.customer.first_name} ${customerPick.customer.last_name},</p>
        <p>Great news! Your stock pick has been approved by our team.</p>
        
        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3>Stock Details:</h3>
          <p><strong>Symbol:</strong> ${customerPick.stock_pick.stock_symbol}</p>
          <p><strong>Description:</strong> ${customerPick.stock_pick.description}</p>
          ${customerPick.stock_pick.sale_price ? `<p><strong>Sale Price:</strong> $${customerPick.stock_pick.sale_price}</p>` : ''}
          ${customerPick.stock_pick.target_price ? `<p><strong>Target Price:</strong> $${customerPick.stock_pick.target_price}</p>` : ''}
          ${customerPick.stock_pick.current_price ? `<p><strong>Current Price:</strong> $${customerPick.stock_pick.current_price}</p>` : ''}
        </div>
        
        <p><strong>Admin Message:</strong><br>${customerPick.admin_response || 'No additional message.'}</p>
        
        <p>Happy investing!<br>Your Trading Team</p>
      `;

      await this.emailService.sendEmail({
        to: customerPick.customer.email,
        subject: 'Your Stock Pick Has Been Approved',
        html: emailHtml,
        text: `Your stock pick ${customerPick.stock_pick.stock_symbol} has been approved. ${customerPick.admin_response || ''}`,
      });

      // Update email sent timestamp
      // await this.customerPickRepo.update(customerPick.id, {
      //   status: CustomerPickStatus.EMAIL_SENT,
      //   email_sent_at: new Date(),
      // });
    } catch (error) {
      console.error('Failed to send stock pick email:', error);
      // Don't throw error to avoid transaction rollback
      // Email failure should not prevent approval
    }
  }

  private async sendRejectionEmail(
    customerPick: CustomerStockPick,
  ): Promise<void> {
    try {
      const emailHtml = `
        <h2>Your Stock Pick Submission Was Not Approved</h2>
        <p>Dear ${customerPick.customer.first_name} ${customerPick.customer.last_name},</p>
        <p>We reviewed your stock pick submission and it was <strong>rejected</strong>.</p>
        <div style="background:#f8d7da;padding:15px;border-radius:5px;color:#842029;margin:20px 0;">
          <p style="margin:0;"><strong>Reason:</strong><br>${customerPick.admin_response || 'No reason provided.'}</p>
        </div>
        <p>You can review available stock picks and submit again if you wish.</p>
        <p>Regards,<br>Your Trading Team</p>
      `;

      await this.emailService.sendEmail({
        to: customerPick.customer.email,
        subject: 'Your Stock Pick Submission Was Not Approved',
        html: emailHtml,
        text: `Your stock pick submission was rejected. Reason: ${customerPick.admin_response || 'No reason provided.'}`,
      });
    } catch (error) {
      console.error('Failed to send rejection email:', error);
    }
  }

  // Helper mapping methods
  private mapToResponseDto(stockPick: StockPick): StockPickResponseDto {
    return {
      id: stockPick.id,
      stock_symbol: stockPick.stock_symbol,
      description: stockPick.description,
      status: stockPick.status,
      availability: stockPick.availability,
      service_type: stockPick.service_type,
      created_by_admin_id: stockPick.created_by_admin_id,
      admin_notes: stockPick.admin_notes ?? undefined,
      target_price: stockPick.target_price ?? undefined,
      current_price: stockPick.current_price ?? undefined,
      sale_price: stockPick.sale_price,
      risk_level: stockPick.risk_level ?? undefined,
      expected_return_min_percent:
        stockPick.expected_return_min_percent ?? undefined,
      expected_return_max_percent:
        stockPick.expected_return_max_percent ?? undefined,
      time_horizon_min_months: stockPick.time_horizon_min_months ?? undefined,
      time_horizon_max_months: stockPick.time_horizon_max_months ?? undefined,
      sector: stockPick.sector ?? undefined,
      analyst_name: stockPick.analyst_name ?? undefined,
      tier_label: stockPick.tier_label ?? undefined,
      key_points: stockPick.key_points ?? undefined,
      email_delivery: stockPick.email_delivery ?? undefined,
      expires_at: stockPick.expires_at ?? undefined,
      is_active: stockPick.is_active,
      created_at: stockPick.created_at,
      updated_at: stockPick.updated_at,
    };
  }

  private mapToCustomerViewDto(
    stockPick: StockPick,
    isSelected = false,
  ): CustomerViewStockPickDto {
    return {
      id: stockPick.id,
      description: stockPick.description,
      status: stockPick.status,
      service_type: stockPick.service_type,
      target_price: stockPick.target_price ?? undefined,
      current_price: stockPick.current_price ?? undefined,
      sale_price: stockPick.sale_price,
      risk_level: stockPick.risk_level ?? undefined,
      expected_return_min_percent:
        stockPick.expected_return_min_percent ?? undefined,
      expected_return_max_percent:
        stockPick.expected_return_max_percent ?? undefined,
      time_horizon_min_months: stockPick.time_horizon_min_months ?? undefined,
      time_horizon_max_months: stockPick.time_horizon_max_months ?? undefined,
      sector: stockPick.sector ?? undefined,
      analyst_name: stockPick.analyst_name ?? undefined,
      tier_label: stockPick.tier_label ?? undefined,
      key_points: stockPick.key_points ?? undefined,
      email_delivery: stockPick.email_delivery ?? undefined,
      expires_at: stockPick.expires_at ?? undefined,
      created_at: stockPick.created_at,
      is_selected: isSelected,
      // Note: stock_symbol is intentionally excluded
    };
  }

  private mapToCustomerPickResponseDto(
    customerPick: CustomerStockPick,
  ): CustomerStockPickResponseDto {
    const baseResponse = {
      id: customerPick.id,
      customer_id: customerPick.customer_id,
      stock_pick_id: customerPick.stock_pick_id,
      status: customerPick.status,
      customer_notes: customerPick.customer_notes ?? undefined,
      admin_response: customerPick.admin_response ?? undefined,
      approved_by_admin_id: customerPick.approved_by_admin_id ?? undefined,
      approved_at: customerPick.approved_at ?? undefined,
      email_sent_at: customerPick.email_sent_at ?? undefined,
      payment_slip_url: customerPick.payment_slip_url ?? undefined,
      payment_slip_filename: customerPick.payment_slip_filename ?? undefined,
      payment_amount: customerPick.payment_amount ?? undefined,
      payment_reference: customerPick.payment_reference ?? undefined,
      payment_submitted_at: customerPick.payment_submitted_at ?? undefined,
      selected_at: customerPick.selected_at,
      updated_at: customerPick.updated_at,
    };

    // Only include stock symbol when the pick is approved
    if (
      customerPick.status === CustomerPickStatus.APPROVED &&
      customerPick.stock_pick
    ) {
      return {
        ...baseResponse,
        stock_symbol: customerPick.stock_pick.stock_symbol,
      };
    }

    return baseResponse;
  }
}
