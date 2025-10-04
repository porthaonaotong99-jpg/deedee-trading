import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { District, DistrictStatus } from './entities/district.entity';

@Injectable()
export class DistrictService {
  constructor(
    @InjectRepository(District)
    private readonly districtRepo: Repository<District>,
  ) {}

  async findAll(options?: { province_id?: string; includeInactive?: boolean }) {
    const where: FindOptionsWhere<District> = {} as FindOptionsWhere<District>;
    if (options?.province_id) where.province_id = options.province_id;
    if (!options?.includeInactive) where.status = DistrictStatus.ACTIVE;
    return this.districtRepo.find({ where, order: { name: 'ASC' } });
  }
}
