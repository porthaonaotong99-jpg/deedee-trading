import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { TransferHistory } from '../transfer-history/entities/transfer-history.entity';
import { TransferIdentify, TransferStatus } from '../../common/enums';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

interface CreateWalletDto {
  customerId: string;
  balance?: number;
}
interface UpdateWalletDto {
  balance?: number;
}

export interface RequestTopupDto {
  customerId: string;
  amount: number;
  payment_slip?: string; // file path / URL after upload handled elsewhere
}

export interface ApproveTopupDto {
  transferId: string;
  adminId: string;
}

export interface RejectTopupDto {
  transferId: string;
  adminId: string;
  reason?: string;
}

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet) private readonly repo: Repository<Wallet>,
    @InjectRepository(TransferHistory)
    private readonly transferRepo: Repository<TransferHistory>,
    // Removed customerServiceRepo & investmentInfoService after moving invest logic to investment-info module
  ) {}

  async create(dto: CreateWalletDto) {
    const entity = this.repo.create({
      customer_id: dto.customerId,
      total_cash: dto.balance ?? 0,
    });
    return this.repo.save(entity);
  }

  async findAll(query: PaginationQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const [data, total] = await this.repo.findAndCount({
      relations: ['customer'],
      take: limit,
      skip: (page - 1) * limit,
      order: { created_at: 'DESC' },
    });
    const totalPages = Math.ceil(total / limit) || 1;
    return { data, total, page, limit, totalPages };
  }

  async findOne(id: string) {
    const entity = await this.repo.findOne({
      where: { id },
      relations: ['customer'],
    });
    if (!entity) throw new NotFoundException('Wallet not found');
    return entity;
  }

  async findByCustomerId(customerId: string) {
    const entity = await this.repo.findOne({
      where: { customer_id: customerId },
      relations: ['customer'],
    });
    if (!entity) throw new NotFoundException('Wallet not found');
    return entity;
  }

  async update(id: string, dto: UpdateWalletDto) {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  // --- Funding Flow (manual payment slip -> admin approval) ---

  async requestTopup(dto: RequestTopupDto) {
    if (dto.amount <= 0) throw new BadRequestException('Amount must be > 0');
    // Ensure wallet exists
    const wallet = await this.repo.findOne({
      where: { customer_id: dto.customerId },
    });
    if (!wallet) throw new NotFoundException('Wallet not found for customer');
    const transfer = this.transferRepo.create({
      customer_id: dto.customerId,
      identify: TransferIdentify.RECHARGE,
      amount: dto.amount,
      payment_slip: dto.payment_slip || undefined,
      status: TransferStatus.PENDING,
    });
    return this.transferRepo.save(transfer);
  }

  async approveTopup(dto: ApproveTopupDto) {
    const transfer = await this.transferRepo.findOne({
      where: { id: dto.transferId },
    });
    if (!transfer) throw new NotFoundException('Topup request not found');
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Only pending topups can be approved');
    }
    const wallet = await this.repo.findOne({
      where: { customer_id: transfer.customer_id },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    wallet.total_cash = Number(wallet.total_cash) + Number(transfer.amount);
    wallet.total_recharge =
      Number(wallet.total_recharge) + Number(transfer.amount);
    transfer.status = TransferStatus.APPROVED;
    transfer.approved_by = dto.adminId;
    await this.repo.save(wallet);
    await this.transferRepo.save(transfer);
    return {
      wallet_id: wallet.id,
      new_balance: wallet.total_cash,
      transfer_id: transfer.id,
    };
  }

  async rejectTopup(dto: RejectTopupDto) {
    const transfer = await this.transferRepo.findOne({
      where: { id: dto.transferId },
    });
    if (!transfer) throw new NotFoundException('Topup request not found');
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Only pending topups can be rejected');
    }
    transfer.status = TransferStatus.REJECTED;
    transfer.rejected_by = dto.adminId;
    // Potentially store reason in future (needs column)
    return this.transferRepo.save(transfer);
  }

  // Investment request logic moved to InvestmentInfoService (investGuaranteedReturns removed)

  async remove(id: string) {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
  }
}
