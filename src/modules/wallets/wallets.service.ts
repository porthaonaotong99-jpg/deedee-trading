import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

interface CreateWalletDto {
  customerId: string;
  balance?: number;
}
interface UpdateWalletDto {
  balance?: number;
}

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet) private readonly repo: Repository<Wallet>,
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

  async update(id: string, dto: UpdateWalletDto) {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: string) {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
  }
}
