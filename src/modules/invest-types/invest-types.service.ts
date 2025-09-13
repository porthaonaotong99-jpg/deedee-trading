import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvestType } from './entities/invest-type.entity';
import { CreateInvestTypeDto } from './dto/create-invest-type.dto';
import { UpdateInvestTypeDto } from './dto/update-invest-type.dto';
import {
  PaginationQueryDto,
  buildPagination,
  PaginatedResult,
} from '../../common/dto/pagination-query.dto';

@Injectable()
export class InvestTypesService {
  constructor(
    @InjectRepository(InvestType)
    private readonly repo: Repository<InvestType>,
  ) {}

  async create(dto: CreateInvestTypeDto, userId?: string): Promise<InvestType> {
    const entity = this.repo.create({ ...dto, created_by: userId });
    return this.repo.save(entity);
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<InvestType>> {
    const { page = 1, limit = 10, sort = 'created_at', order = 'DESC' } = query;
    const [items, total] = await this.repo.findAndCount({
      order: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit > 100 ? 100 : limit,
    });
    return buildPagination(items, total, page, limit);
  }

  async findOne(id: string): Promise<InvestType> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('InvestType not found');
    return found;
  }

  async update(id: string, dto: UpdateInvestTypeDto): Promise<InvestType> {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
  }
}
