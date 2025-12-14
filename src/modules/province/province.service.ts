import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Province, ProvinceStatus } from './entities/province.entity';
import {
  PaginationQueryDto,
  buildPagination,
  PaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';

@Injectable()
export class ProvinceService {
  constructor(
    @InjectRepository(Province)
    private readonly provinceRepo: Repository<Province>,
  ) {}

  async create(dto: CreateProvinceDto): Promise<Province> {
    const province = this.provinceRepo.create({
      name: dto.name,
      country_id: dto.country_id,
      status: dto.status ?? ProvinceStatus.ACTIVE,
    });
    return this.provinceRepo.save(province);
  }

  async findOne(id: string): Promise<Province> {
    const province = await this.provinceRepo.findOne({ where: { id } });
    if (!province) {
      throw new NotFoundException(`Province with ID ${id} not found`);
    }
    return province;
  }

  async update(id: string, dto: UpdateProvinceDto): Promise<Province> {
    const province = await this.findOne(id);
    Object.assign(province, dto);
    return this.provinceRepo.save(province);
  }

  async findAll(options?: { country_id?: string; includeInactive?: boolean }) {
    const where: FindOptionsWhere<Province> = {} as FindOptionsWhere<Province>;
    if (options?.country_id) where.country_id = options.country_id;
    if (!options?.includeInactive) where.status = ProvinceStatus.ACTIVE;
    return this.provinceRepo.find({ where, order: { name: 'ASC' } });
  }

  async findAllPaginated(
    query: PaginationQueryDto,
    options?: { country_id?: string; includeInactive?: boolean },
  ): Promise<PaginatedResult<Province>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);

    const where: FindOptionsWhere<Province> = {} as FindOptionsWhere<Province>;
    if (options?.country_id) where.country_id = options.country_id;
    if (!options?.includeInactive) where.status = ProvinceStatus.ACTIVE;

    const [data, total] = await this.provinceRepo.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return buildPagination(data, total, page, limit);
  }
}
