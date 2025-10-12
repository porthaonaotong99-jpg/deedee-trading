import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerStock } from './entities/customer-stock.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class CustomerStocksService {
  constructor(
    @InjectRepository(CustomerStock)
    private readonly repo: Repository<CustomerStock>,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const [data, total] = await this.repo.findAndCount({
      relations: ['customer', 'stock'],
      take: limit,
      skip: (page - 1) * limit,
      order: { created_at: 'DESC' },
    });
    const totalPages = Math.ceil(total / limit) || 1;
    return { data, total, page, limit, totalPages };
  }

  async findAllForCustomer(customerId: string, query: PaginationQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const [data, total] = await this.repo.findAndCount({
      where: { customer_id: customerId },
      relations: ['customer', 'stock'],
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
      relations: ['customer', 'stock'],
    });
    if (!entity) throw new NotFoundException('CustomerStock not found');
    return entity;
  }
  async findOneByCustomer(id: string, customerId: string) {
    const entity = await this.repo.findOne({
      where: { id, customer_id: customerId },
      relations: ['customer', 'stock'],
    });
    if (!entity) throw new NotFoundException('CustomerStock not found');
    return entity;
  }

  async getSummary(customerId: string) {
    // Fetch all positions for the customer
    const positions = await this.repo.find({
      where: { customer_id: customerId },
    });

    const reduceNum = (val?: number | null) =>
      typeof val === 'number' && Number.isFinite(val) ? val : 0;

    let totalInvested = 0; // cost basis across positions
    let totalValue = 0; // market value across positions

    for (const p of positions) {
      totalInvested += reduceNum(p.cost_basis);
      totalValue += reduceNum(p.market_value);
    }

    const totalProfit = totalValue - totalInvested;
    const profitPercent =
      totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalValue,
      totalProfit,
      profitPercent,
    };
  }
}
