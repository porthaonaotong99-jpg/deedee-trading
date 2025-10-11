import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransferHistory } from './entities/transfer-history.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { PaginatedResult } from '../../common/dto/pagination-query.dto';

interface DateRangeOptions {
  startDate?: Date;
  endDate?: Date;
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
      .leftJoinAndSelect('th.customer', 'customer')
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
}
