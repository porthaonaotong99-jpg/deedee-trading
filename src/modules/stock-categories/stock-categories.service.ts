import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockCategory } from './entities/stock-category.entity';
import { CreateStockCategoryDto } from './dto/create-stock-category.dto';
import { UpdateStockCategoryDto } from './dto/update-stock-category.dto';
import {
  PaginationQueryDto,
  buildPagination,
  PaginatedResult,
} from '../../common/dto/pagination-query.dto';

@Injectable()
export class StockCategoriesService {
  constructor(
    @InjectRepository(StockCategory)
    private readonly repo: Repository<StockCategory>,
  ) {}

  async create(dto: CreateStockCategoryDto): Promise<StockCategory> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<StockCategory>> {
    const { page = 1, limit = 10, sort = 'created_at', order = 'DESC' } = query;
    const [items, total] = await this.repo.findAndCount({
      order: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit > 100 ? 100 : limit,
    });
    return buildPagination(items, total, page, limit);
  }

  async findOne(id: string): Promise<StockCategory> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('StockCategory not found');
    return found;
  }

  async update(
    id: string,
    dto: UpdateStockCategoryDto,
  ): Promise<StockCategory> {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
  }
}
