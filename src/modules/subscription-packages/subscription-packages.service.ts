import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPackage } from './entities/subscription-package.entity';
import {
  SubscriptionPackageFilterDto,
  SubscriptionPackageResponseDto,
} from './dto/subscription-packages.dto';
import {
  PaginationUtil,
  PaginatedResult,
} from '../../common/utils/pagination.util';

@Injectable()
export class SubscriptionPackagesService {
  constructor(
    @InjectRepository(SubscriptionPackage)
    private readonly repo: Repository<SubscriptionPackage>,
  ) {}

  async list(
    filter: SubscriptionPackageFilterDto,
  ): Promise<PaginatedResult<SubscriptionPackageResponseDto>> {
    const { page, limit, skip } = PaginationUtil.calculatePagination({
      page: filter.page,
      limit: filter.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });

    const qb = this.repo.createQueryBuilder('p');
    if (filter.service_type)
      qb.andWhere('p.service_type = :st', { st: filter.service_type });
    if (filter.active !== undefined)
      qb.andWhere('p.active = :ac', { ac: filter.active });
    if (filter.q) qb.andWhere('p.description ILIKE :q', { q: `%${filter.q}%` });

    const [rows, total] = await qb
      .orderBy('p.duration_months', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data: SubscriptionPackageResponseDto[] = rows.map((r) => ({
      id: r.id,
      service_type: r.service_type,
      duration_months: r.duration_months,
      price: Number(r.price),
      currency: r.currency,
      description: r.description ?? undefined,
      features: r.features ?? undefined,
      active: r.active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return PaginationUtil.createPaginatedResult(data, total, { page, limit });
  }

  async findActiveById(
    id: string,
    serviceType?: string,
  ): Promise<SubscriptionPackage | null> {
    const qb = this.repo.createQueryBuilder('p').where('p.id = :id', { id });
    qb.andWhere('p.active = true');
    if (serviceType) qb.andWhere('p.service_type = :st', { st: serviceType });
    return qb.getOne();
  }
}
