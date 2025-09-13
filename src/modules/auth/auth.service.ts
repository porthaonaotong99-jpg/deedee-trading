import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs'; // kept for backward compatibility with existing hashes
import * as argon2 from 'argon2';

// Typed adapter interface to avoid unsafe any/error typed value warnings
interface Argon2Adapter {
  argon2id: number;
  hash(
    password: string | Buffer,
    options?: {
      type?: number;
      memoryCost?: number;
      timeCost?: number;
      parallelism?: number;
      raw?: boolean;
      version?: number;
      hashLength?: number;
      salt?: Buffer | string;
      saltLength?: number;
    },
  ): Promise<string>;
  verify(hash: string | Buffer, password: string | Buffer): Promise<boolean>;
}

// Extract and strongly type only the members we use
const _argon2 = argon2 as unknown as Argon2Adapter;
const argon2id = _argon2.argon2id;
const argon2Hash = (
  password: string | Buffer,
  options?: Parameters<Argon2Adapter['hash']>[1],
) => _argon2.hash(password, options);
const argon2Verify = (hash: string | Buffer, password: string | Buffer) =>
  _argon2.verify(hash, password);
import { User } from '../users/entities/user.entity';
import { Customer } from '../customers/entities/customer.entity';
import { LoginDto, CustomerLoginDto, LoginResponseDto } from './dto/auth.dto';
import { CustomerRegisterDto } from './dto/register.dto';
import { JwtPayload } from '../../common/interfaces';
import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly walletsService: WalletsService,
  ) {}

  async loginUser(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.userRepository.findOne({
      where: { username: loginDto.username },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.verifyPassword(
      loginDto.password,
      user.password,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      type: 'user',
      roleId: user.role_id,
    };

    const secret =
      this.configService.get<string>('JWT_USER_SECRET') ||
      this.configService.get<string>('JWT_SECRET', 'your-secret-key');
    const access_token = this.jwtService.sign(payload, { secret });

    return {
      access_token,
      token_type: 'Bearer',
      expires_in: 86400, // 24 hours
      user: {
        id: user.id,
        username: user.username,
        role: user.role?.name || undefined,
      },
    };
  }

  async loginCustomer(loginDto: CustomerLoginDto): Promise<LoginResponseDto> {
    const whereCondition = loginDto.username
      ? { username: loginDto.username }
      : { email: loginDto.email };

    const customer = await this.customerRepository.findOne({
      where: whereCondition,
    });

    if (!customer || !customer.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordValid = await this.verifyPassword(
      loginDto.password,
      customer.password,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: customer.id,
      username: customer.username || customer.email || '',
      type: 'customer',
    };

    const secret =
      this.configService.get<string>('JWT_CUSTOMER_SECRET') ||
      this.configService.get<string>('JWT_SECRET', 'your-secret-key');
    const access_token = this.jwtService.sign(payload, { secret });

    return {
      access_token,
      token_type: 'Bearer',
      expires_in: 86400, // 24 hours
      customer: {
        id: customer.id,
        username: customer.username,
        email: customer.email,
      },
    };
  }

  async hashPassword(password: string): Promise<string> {
    const hashed = await argon2Hash(password, {
      type: argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });
    return hashed;
  }

  private async verifyPassword(
    plain: string,
    stored: string,
  ): Promise<boolean> {
    // Detect argon2 hash format (starts with $argon2...)
    if (stored.startsWith('$argon2')) {
      return await argon2Verify(stored, plain);
    }
    // Fallback to bcrypt for legacy hashes
    const matches = await bcrypt.compare(plain, stored);
    // If matches and is legacy, optionally rehash & persist (deferred to avoid side-effects here)
    return matches;
  }

  async registerCustomer(dto: CustomerRegisterDto): Promise<{
    id: string;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    wallet_id: string;
  }> {
    // Ensure uniqueness on username or email
    const existingByUsername = await this.customerRepository.findOne({
      where: { username: dto.username },
    });
    if (existingByUsername) {
      throw new ConflictException('Username already taken');
    }
    const existingByEmail = await this.customerRepository.findOne({
      where: { email: dto.email },
    });
    if (existingByEmail) {
      throw new ConflictException('Email already registered');
    }

    const hashed = await this.hashPassword(dto.password);
    const entity = this.customerRepository.create({
      username: dto.username,
      email: dto.email,
      password: hashed,
      first_name: dto.first_name,
      last_name: dto.last_name,
      address: dto.address,
    });
    const saved = await this.customerRepository.save(entity);

    // Create wallet for this customer (idempotent assumption: first creation only)
    const wallet = await this.walletsService.create({ customerId: saved.id });

    return {
      id: saved.id,
      username: saved.username,
      email: saved.email,
      first_name: saved.first_name,
      last_name: saved.last_name,
      wallet_id: wallet.id,
    };
  }
}
