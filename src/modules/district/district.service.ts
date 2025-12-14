import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { District, DistrictStatus } from './entities/district.entity';
import {
  PaginationQueryDto,
  buildPagination,
  PaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';

@Injectable()
export class DistrictService {
  constructor(
    @InjectRepository(District)
    private readonly districtRepo: Repository<District>,
  ) {}

  async create(dto: CreateDistrictDto): Promise<District> {
    const district = this.districtRepo.create({
      name: dto.name,
      province_id: dto.province_id,
      postcode: dto.postcode,
      status: dto.status ?? DistrictStatus.ACTIVE,
    });
    return this.districtRepo.save(district);
  }

  async findOne(id: string): Promise<District> {
    const district = await this.districtRepo.findOne({ where: { id } });
    if (!district) {
      throw new NotFoundException(`District with ID ${id} not found`);
    }
    return district;
  }

  async update(id: string, dto: UpdateDistrictDto): Promise<District> {
    const district = await this.findOne(id);
    Object.assign(district, dto);
    return this.districtRepo.save(district);
  }

  async findAll(options?: { province_id?: string; includeInactive?: boolean }) {
    const where: FindOptionsWhere<District> = {} as FindOptionsWhere<District>;
    if (options?.province_id) where.province_id = options.province_id;
    if (!options?.includeInactive) where.status = DistrictStatus.ACTIVE;
    return this.districtRepo.find({ where, order: { name: 'ASC' } });
  }

  async findAllPaginated(
    query: PaginationQueryDto,
    options?: { province_id?: string; includeInactive?: boolean },
  ): Promise<PaginatedResult<District>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);

    const where: FindOptionsWhere<District> = {} as FindOptionsWhere<District>;
    if (options?.province_id) where.province_id = options.province_id;
    if (!options?.includeInactive) where.status = DistrictStatus.ACTIVE;

    const [data, total] = await this.districtRepo.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return buildPagination(data, total, page, limit);
  }
}
