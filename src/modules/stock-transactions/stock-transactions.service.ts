import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockTransaction } from './entities/stock-transaction.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class StockTransactionsService {
  constructor(
    @InjectRepository(StockTransaction)
    private readonly repo: Repository<StockTransaction>,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const [data, total] = await this.repo.findAndCount({
      relations: ['stock', 'customer'],
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
      relations: ['stock', 'customer'],
    });
    if (!entity) throw new NotFoundException('StockTransaction not found');
    return entity;
  }
}
