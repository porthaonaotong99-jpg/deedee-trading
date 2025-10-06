import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InvestmentInfo } from './entities/investment-info.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { TransferHistory } from '../transfer-history/entities/transfer-history.entity';
import { CustomerService } from '../customers/entities/customer-service.entity';
import { TransferIdentify, TransferStatus } from '../../common/enums';
import { InvestmentInfoStatus } from '../../common/enums';
import { CustomerServiceType } from '../customers/entities/customer-service.entity';
import { PaginationUtil } from '../../common/utils/pagination.util';

interface CreateInvestmentRequestDto {
  customer_id: string;
  service_id: string;
  amount: number;
  interest_rate?: number | null;
  period?: number | null; // months
  noted?: string | null;
}

@Injectable()
export class InvestmentInfoService {
  constructor(
    @InjectRepository(InvestmentInfo)
    private readonly repo: Repository<InvestmentInfo>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(TransferHistory)
    private readonly transferRepo: Repository<TransferHistory>,
    @InjectRepository(CustomerService)
    private readonly customerServiceRepo: Repository<CustomerService>,
    private readonly dataSource: DataSource,
  ) {}

  async createPending(dto: CreateInvestmentRequestDto) {
    if (dto.amount <= 0) throw new BadRequestException('Amount must be > 0');
    const entity = this.repo.create({
      name: 'guaranteed_returns_investment',
      amount: dto.amount,
      interest_rate: dto.interest_rate ?? null,
      period: dto.period ?? null,
      noted: dto.noted ?? null,
      status: InvestmentInfoStatus.PENDING,
      customer_id: dto.customer_id,
      service_id: dto.service_id,
    } as Partial<InvestmentInfo>);
    return this.repo.save(entity);
  }

  // Customer initiated: create a pending guaranteed returns investment request + matching pending transfer
  async requestGuaranteedReturnsInvestment(customerId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Amount must be > 0');
    // Confirm wallet & balance (do NOT deduct now; just ensure sufficient funds so user can't request more than available)
    const wallet = await this.walletRepo.findOne({
      where: { customer_id: customerId },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (Number(wallet.total_cash) < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }
    // Find guaranteed returns service
    const service = await this.customerServiceRepo.findOne({
      where: {
        customer_id: customerId,
        service_type: CustomerServiceType.GUARANTEED_RETURNS,
      },
    });
    if (!service) {
      throw new NotFoundException(
        'Guaranteed returns service not found for customer',
      );
    }
    if (!service.active) throw new BadRequestException('Service is not active');

    const pending = await this.createPending({
      customer_id: customerId,
      service_id: service.id,
      amount,
    });
    const transfer = this.transferRepo.create({
      customer_id: customerId,
      identify: TransferIdentify.INVEST,
      amount,
      service_id: service.id,
      status: TransferStatus.PENDING,
    });
    await this.transferRepo.save(transfer);
    return {
      investment_request_id: pending.id,
      transfer_history_id: transfer.id,
      status: 'pending_admin_approval',
    };
  }

  async approve(id: string, adminId: string, profit?: number) {
    // Use explicit transaction for consistency and concurrency safety
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(InvestmentInfo);
      const walletRepo = manager.getRepository(Wallet);
      const transferRepo = manager.getRepository(TransferHistory);
      const customerServiceRepo = manager.getRepository(CustomerService);

      const entity = await repo.findOne({ where: { id } });
      if (!entity) throw new NotFoundException('Investment request not found');
      if (entity.status !== InvestmentInfoStatus.PENDING) {
        throw new BadRequestException('Only pending requests can be approved');
      }
      if (!entity.customer_id || !entity.service_id) {
        throw new BadRequestException('Investment request missing relations');
      }

      // Fetch wallet & service
      const wallet = await walletRepo.findOne({
        where: { customer_id: entity.customer_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) throw new NotFoundException('Wallet not found for customer');
      if (Number(wallet.total_cash) < Number(entity.amount)) {
        throw new BadRequestException('Insufficient wallet balance');
      }
      const service = await customerServiceRepo.findOne({
        where: { id: entity.service_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!service)
        throw new NotFoundException('Target service not found for investment');
      if (!service.active)
        throw new BadRequestException('Service is not active');

      // Locate matching pending transfer history entry (identify=INVEST)
      const transfer = await transferRepo.findOne({
        where: {
          customer_id: entity.customer_id,
          service_id: entity.service_id,
          identify: TransferIdentify.INVEST,
          status: TransferStatus.PENDING,
          amount: entity.amount,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!transfer)
        throw new NotFoundException('Matching pending transfer not found');

      // Adjust balances
      wallet.total_cash = Number(wallet.total_cash) - Number(entity.amount);
      service.invested_amount =
        Number(service.invested_amount) + Number(entity.amount);

      // Update statuses & audit fields
      entity.status = InvestmentInfoStatus.INVESTING;
      if (profit != null) entity.profit = profit;
      entity.approved_by = adminId;
      entity.approved_at = new Date();
      transfer.status = TransferStatus.APPROVED;
      transfer.approved_by = adminId;

      await walletRepo.save(wallet);
      await customerServiceRepo.save(service);
      await transferRepo.save(transfer);
      return repo.save(entity);
    });
  }

  async reject(id: string, adminId: string, note?: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(InvestmentInfo);
      const transferRepo = manager.getRepository(TransferHistory);

      const entity = await repo.findOne({ where: { id } });
      if (!entity) throw new NotFoundException('Investment request not found');
      if (entity.status !== InvestmentInfoStatus.PENDING) {
        throw new BadRequestException('Only pending requests can be rejected');
      }

      // Find transfer if exists and mark rejected
      if (entity.customer_id && entity.service_id) {
        const transfer = await transferRepo.findOne({
          where: {
            customer_id: entity.customer_id,
            service_id: entity.service_id,
            identify: TransferIdentify.INVEST,
            status: TransferStatus.PENDING,
            amount: entity.amount,
          },
          lock: { mode: 'pessimistic_write' },
        });
        if (transfer) {
          transfer.status = TransferStatus.REJECTED;
          transfer.rejected_by = adminId;
          await transferRepo.save(transfer);
        }
      }

      entity.status = InvestmentInfoStatus.REJECTED;
      if (note) entity.noted = note;
      entity.rejected_by = adminId;
      entity.rejected_at = new Date();
      return repo.save(entity);
    });
  }

  async listGuaranteedReturns(options: {
    status?: InvestmentInfoStatus | string;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = PaginationUtil.calculatePagination({
      page: options.page,
      limit: options.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });

    const qb = this.repo.createQueryBuilder('inv');
    qb.where('inv.name = :name', {
      name: 'guaranteed_returns_investment',
    });
    if (options.status) {
      qb.andWhere('inv.status = :status', { status: options.status });
    }
    qb.orderBy('inv.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [records, total] = await qb.getManyAndCount();
    return PaginationUtil.createPaginatedResult(records, total, {
      page,
      limit,
    });
  }
}
