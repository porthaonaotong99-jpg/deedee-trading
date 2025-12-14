import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Country, CountryStatus } from './entities/country.entity';
import {
  PaginationQueryDto,
  buildPagination,
  PaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Injectable()
export class CountryService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
  ) {}

  async create(dto: CreateCountryDto): Promise<Country> {
    const country = this.countryRepo.create({
      name: dto.name,
      status: dto.status ?? CountryStatus.ACTIVE,
    });
    return this.countryRepo.save(country);
  }

  async findOne(id: string): Promise<Country> {
    const country = await this.countryRepo.findOne({ where: { id } });
    if (!country) {
      throw new NotFoundException(`Country with ID ${id} not found`);
    }
    return country;
  }

  async update(id: string, dto: UpdateCountryDto): Promise<Country> {
    const country = await this.findOne(id);
    Object.assign(country, dto);
    return this.countryRepo.save(country);
  }

  async findAll(options?: { includeInactive?: boolean }) {
    const where: FindOptionsWhere<Country> | undefined =
      options?.includeInactive ? undefined : { status: CountryStatus.ACTIVE };
    return this.countryRepo.find({ where, order: { name: 'ASC' } });
  }

  async findAllPaginated(
    query: PaginationQueryDto,
    options?: { includeInactive?: boolean },
  ): Promise<PaginatedResult<Country>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);

    const where: FindOptionsWhere<Country> | undefined =
      options?.includeInactive ? undefined : { status: CountryStatus.ACTIVE };

    const [data, total] = await this.countryRepo.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return buildPagination(data, total, page, limit);
  }
}
