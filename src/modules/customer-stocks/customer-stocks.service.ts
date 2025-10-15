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
    const [rawData, total] = await this.repo.findAndCount({
      where: { customer_id: customerId },
      relations: ['customer', 'stock'],
      take: limit,
      skip: (page - 1) * limit,
      order: { created_at: 'DESC' },
    });

    // Transform data to match the desired format
    const data = rawData.map((customerStock) => {
      const stock = customerStock.stock;
      const shares = customerStock.share || 0;
      const costBasis = customerStock.cost_basis || 0;
      const marketValue = customerStock.market_value || 0;
      const currentPrice = stock?.last_price || 0;

      // Calculate profit/loss
      const profit = marketValue - costBasis;
      const changePercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;
      const isPositive = profit >= 0;

      // Format currency based on stock currency or default to USD
      const currency = stock?.currency || 'USD';
      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);
      };

      const formatPercent = (value: number) => {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}%`;
      };

      return {
        id: stock?.id || 'N/A',
        name: stock?.name || 'Unknown Stock',
        market: stock?.country || stock?.exchange || 'Unknown',
        shares: shares,
        currentPrice: formatCurrency(currentPrice),
        totalValue: formatCurrency(marketValue),
        invested: formatCurrency(costBasis),
        profit: formatCurrency(profit),
        change: formatPercent(changePercent),
        isPositive: isPositive,
        // Include original ID for reference if needed
        originalId: customerStock.id,
      };
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
