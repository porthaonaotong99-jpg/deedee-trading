import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransferHistory } from './entities/transfer-history.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { PaginatedResult } from '../../common/dto/pagination-query.dto';
import { TransferStatus, TransferIdentify } from '../../common/enums';

interface DateRangeOptions {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  identify?: string;
}

@Injectable()
export class TransferHistoryService {
  constructor(
    @InjectRepository(TransferHistory)
    private readonly repo: Repository<TransferHistory>,
  ) {}

  async findAll(
    query: PaginationQueryDto,
    date?: DateRangeOptions,
  ): Promise<PaginatedResult<TransferHistory>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const qb = this.repo
      .createQueryBuilder('th')
      .leftJoinAndSelect('th.customer', 'customer')
      .orderBy('th.created_at', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (date?.startDate) {
      qb.andWhere('th.created_at >= :start', { start: date.startDate });
    }
    if (date?.endDate) {
      qb.andWhere('th.created_at <= :end', { end: date.endDate });
    }
    if (date?.status) {
      qb.andWhere('th.status = :status', { status: date.status });
    }
    if (date?.identify) {
      qb.andWhere('th.identify = :identify', { identify: date.identify });
    }

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit) || 1;
    return { data: items, total, page, limit, totalPages };
  }

  async findOne(id: string) {
    const entity = await this.repo.findOne({
      where: { id },
      relations: ['customer'],
    });
    if (!entity) throw new NotFoundException('TransferHistory not found');
    return entity;
  }

  async findAllForCustomer(
    customerId: string,
    query: PaginationQueryDto,
    date?: DateRangeOptions,
  ): Promise<PaginatedResult<TransferHistory>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const qb = this.repo
      .createQueryBuilder('th')
      // .leftJoinAndSelect('th.customer', 'customer')
      .where('th.customer_id = :cid', { cid: customerId })
      .orderBy('th.created_at', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (date?.startDate) {
      qb.andWhere('th.created_at >= :start', { start: date.startDate });
    }
    if (date?.endDate) {
      qb.andWhere('th.created_at <= :end', { end: date.endDate });
    }

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit) || 1;
    return { data: items, total, page, limit, totalPages };
  }

  async findOneForCustomer(id: string, customerId: string) {
    const entity = await this.repo.findOne({
      where: { id, customer_id: customerId },
      relations: ['customer'],
    });
    if (!entity) throw new NotFoundException('TransferHistory not found');
    return entity;
  }

  async approve(id: string, adminId: string): Promise<TransferHistory> {
    const transfer = await this.repo.findOne({
      where: { id },
      relations: ['customer'],
    });
    
    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }
    
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Transfer is not in pending status');
    }
    
    transfer.status = TransferStatus.APPROVED;
    transfer.approved_by = adminId;
    
    return this.repo.save(transfer);
  }

  async reject(id: string, adminId: string): Promise<TransferHistory> {
    const transfer = await this.repo.findOne({
      where: { id },
      relations: ['customer'],
    });
    
    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }
    
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Transfer is not in pending status');
    }
    
    transfer.status = TransferStatus.REJECTED;
    transfer.rejected_by = adminId;
    
    return this.repo.save(transfer);
  }

  async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const [total, pending, approved, rejected] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { status: TransferStatus.PENDING } }),
      this.repo.count({ where: { status: TransferStatus.APPROVED } }),
      this.repo.count({ where: { status: TransferStatus.REJECTED } }),
    ]);

    return { total, pending, approved, rejected };
  }
}
