import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

interface CreateRoleDto {
  name: string;
}
interface UpdateRoleDto {
  name?: string;
}

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly repo: Repository<Role>,
  ) {}

  async create(dto: CreateRoleDto) {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async findAll(query: PaginationQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const [data, total] = await this.repo.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      order: { created_at: 'DESC' },
    });
    const totalPages = Math.ceil(total / limit) || 1;
    return { data, total, page, limit, totalPages };
  }

  async findOne(id: string) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Role not found');
    return entity;
  }

  async update(id: string, dto: UpdateRoleDto) {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: string) {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
  }
}
