import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPackage } from './entities/subscription-package.entity';
import {
  SubscriptionPackageFilterDto,
  SubscriptionPackageResponseDto,
} from './dto/subscription-packages.dto';
import {
  CreateSubscriptionPackageDto,
  UpdateSubscriptionPackageDto,
} from './dto/admin-subscription-packages.dto';
import {
  PaginationUtil,
  PaginatedResult,
} from '../../common/utils/pagination.util';

@Injectable()
export class AdminSubscriptionPackagesService {
  constructor(
    @InjectRepository(SubscriptionPackage)
    private readonly repo: Repository<SubscriptionPackage>,
  ) {}

  async create(
    dto: CreateSubscriptionPackageDto,
  ): Promise<SubscriptionPackageResponseDto> {
    const entity = this.repo.create({
      service_type: dto.service_type,
      duration_months: dto.duration_months,
      price: String(dto.price),
      currency: dto.currency || 'USD',
      description: dto.description || null,
      features: dto.features || null,
      active: dto.active !== undefined ? dto.active : true,
    });

    const saved = await this.repo.save(entity);

    return this.toResponseDto(saved);
  }

  async findAll(
    filter: SubscriptionPackageFilterDto,
  ): Promise<PaginatedResult<SubscriptionPackageResponseDto>> {
    const { page, limit, skip } = PaginationUtil.calculatePagination({
      page: filter.page,
      limit: filter.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });

    const qb = this.repo.createQueryBuilder('p');

    if (filter.service_type) {
      qb.andWhere('p.service_type = :st', { st: filter.service_type });
    }

    if (filter.active !== undefined) {
      qb.andWhere('p.active = :ac', { ac: filter.active });
    }

    if (filter.q) {
      qb.andWhere('p.description ILIKE :q', { q: `%${filter.q}%` });
    }

    const [rows, total] = await qb
      .orderBy('p.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data = rows.map((r) => this.toResponseDto(r));

    return PaginationUtil.createPaginatedResult(data, total, { page, limit });
  }

  async findOne(id: string): Promise<SubscriptionPackageResponseDto | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    return this.toResponseDto(entity);
  }

  async update(
    id: string,
    dto: UpdateSubscriptionPackageDto,
  ): Promise<SubscriptionPackageResponseDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Subscription package not found');
    }

    if (dto.service_type !== undefined) {
      entity.service_type = dto.service_type;
    }
    if (dto.duration_months !== undefined) {
      entity.duration_months = dto.duration_months;
    }
    if (dto.price !== undefined) {
      entity.price = String(dto.price);
    }
    if (dto.currency !== undefined) {
      entity.currency = dto.currency;
    }
    if (dto.description !== undefined) {
      entity.description = dto.description;
    }
    if (dto.features !== undefined) {
      entity.features = dto.features;
    }
    if (dto.active !== undefined) {
      entity.active = dto.active;
    }

    const saved = await this.repo.save(entity);
    return this.toResponseDto(saved);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Subscription package not found');
    }
    await this.repo.remove(entity);
  }

  async toggleActive(id: string): Promise<SubscriptionPackageResponseDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Subscription package not found');
    }

    entity.active = !entity.active;
    const saved = await this.repo.save(entity);
    return this.toResponseDto(saved);
  }

  private toResponseDto(
    entity: SubscriptionPackage,
  ): SubscriptionPackageResponseDto {
    return {
      id: entity.id,
      service_type: entity.service_type,
      duration_months: entity.duration_months,
      price: Number(entity.price),
      currency: entity.currency,
      description: entity.description ?? undefined,
      features: entity.features ?? undefined,
      active: entity.active,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }
}
