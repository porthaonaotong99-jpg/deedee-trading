import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Province, ProvinceStatus } from './entities/province.entity';

@Injectable()
export class ProvinceService {
  constructor(
    @InjectRepository(Province)
    private readonly provinceRepo: Repository<Province>,
  ) {}

  async findAll(options?: { country_id?: string; includeInactive?: boolean }) {
    const where: FindOptionsWhere<Province> = {} as FindOptionsWhere<Province>;
    if (options?.country_id) where.country_id = options.country_id;
    if (!options?.includeInactive) where.status = ProvinceStatus.ACTIVE;
    return this.provinceRepo.find({ where, order: { name: 'ASC' } });
  }
}
