import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

// DTO interfaces for clarity & reuse
export interface CreateUserDtoInternal {
  username: string;
  password: string; // hashed upstream (consider hashing here later)
  roleId?: string;
}

export interface UpdateUserDtoInternal {
  username?: string;
  password?: string; // hashed upstream (consider hashing here later)
  roleId?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'role',
        'role.rolePermissions',
        'role.rolePermissions.permission',
      ],
    });

    if (!user || !user.role?.rolePermissions) {
      return [];
    }

    return user.role.rolePermissions
      .filter((rp) => rp.permission?.name)
      .map((rp) => rp.permission.name);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
      relations: ['role'],
    });
  }

  // ---- CRUD for administration (used by UsersController) ----
  async create(dto: CreateUserDtoInternal): Promise<User> {
    const entity = this.userRepository.create({
      username: dto.username,
      password: dto.password,
      // Only assign relation if roleId provided
      ...(dto.roleId ? { role: { id: dto.roleId } as User['role'] } : {}),
    });
    return this.userRepository.save(entity);
  }

  async findAll(query: { page?: number; limit?: number }): Promise<{
    data: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const [data, total] = await this.userRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: ['role'],
      order: { created_at: 'DESC' },
    });
    const totalPages = Math.ceil(total / limit) || 1;
    return { data, total, page, limit, totalPages };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDtoInternal): Promise<User> {
    const user = await this.findOne(id);
    if (dto.username !== undefined) user.username = dto.username;
    if (dto.password !== undefined) user.password = dto.password;
    if (dto.roleId !== undefined) {
      // Preserve current relation if empty string/null passed -> detach
      if (dto.roleId) {
        user.role = { id: dto.roleId } as User['role'];
      } else {
        user.role = null as unknown as User['role'];
      }
    }
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }
}
