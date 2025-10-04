import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Country, CountryStatus } from './entities/country.entity';

@Injectable()
export class CountryService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
  ) {}

  async findAll(options?: { includeInactive?: boolean }) {
    const where: FindOptionsWhere<Country> | undefined =
      options?.includeInactive ? undefined : { status: CountryStatus.ACTIVE };
    return this.countryRepo.find({ where, order: { name: 'ASC' } });
  }
}
