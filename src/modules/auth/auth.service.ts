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
import { SessionsService } from '../sessions/sessions.service';
import { parseDeviceContext } from '../../common/utils/device.util';
import { lookupGeoLocation } from '../../common/utils/geoip.util';

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
    private readonly sessionsService: SessionsService,
  ) {}

  async loginUser(loginDto: LoginDto): Promise<LoginResponseDto> {
    console.log({ loginDto });
    const user = await this.userRepository.findOne({
      where: { username: loginDto.username },
      relations: ['role'],
    });
    console.log({ user });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.verifyPassword(
      loginDto.password,
      user.password,
    );
    console.log({ passwordValid });
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

  async loginCustomer(
    loginDto: CustomerLoginDto,
    deviceRaw?: {
      userAgent?: string;
      ipAddress?: string;
      providedDeviceId?: string;
      providedDeviceName?: string;
      country?: string;
      province?: string;
      district?: string;
      latitude?: number;
      longitude?: number;
    },
  ): Promise<
    LoginResponseDto & {
      refresh_token?: string;
      session_id?: string;
      device_id?: string;
      device_name?: string;
      country?: string;
      province?: string;
      district?: string;
      latitude?: number;
      longitude?: number;
    }
  > {
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

    // Create persistent session + refresh token
    const refreshTtlDays = Number(
      this.configService.get<string>('CUSTOMER_REFRESH_TTL_DAYS', '30'),
    );
    // Always trace location from backend IP
    const geo = lookupGeoLocation(deviceRaw?.ipAddress || '');
    const parsed = parseDeviceContext({
      ...deviceRaw,
      country: geo.country,
      province: geo.province,
      district: geo.district,
      latitude: geo.latitude,
      longitude: geo.longitude,
    });
    const { session, refreshToken } = await this.sessionsService.create({
      customerId: customer.id,
      refreshTtlDays,
      userAgent: parsed.userAgent,
      ipAddress: parsed.ipAddress,
      deviceId: parsed.deviceId,
      deviceName: parsed.deviceName,
      metadata: parsed.metadata,
      country: parsed.country,
      province: parsed.province,
      district: parsed.district,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      geo_location: geo.geo as Record<string, unknown>,
    });

    const payload: JwtPayload & { sid: string } = {
      sub: customer.id,
      username: customer.username || customer.email || '',
      type: 'customer',
      sid: session.id,
    };

    const secret =
      this.configService.get<string>('JWT_CUSTOMER_SECRET') ||
      this.configService.get<string>('JWT_SECRET', 'your-secret-key');
    const access_token = this.jwtService.sign(payload, { secret });

    return {
      access_token,
      token_type: 'Bearer',
      expires_in: 86400, // 24 hours
      refresh_token: refreshToken,
      session_id: session.id,
      customer: {
        id: customer.id,
        username: customer.username,
        email: customer.email,
      },
      device_id: session.device_id,
      device_name: session.device_name,
      country: session.country,
      province: session.province,
      district: session.district,
      latitude: session.latitude,
      longitude: session.longitude,
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
    const debug = process.env.AUTH_DEBUG === '1';
    const dbg = (...a: unknown[]) =>
      debug && console.log('[AUTH:verifyPassword]', ...a);
    try {
      dbg('inputs', {
        plainLength: plain?.length,
        storedPrefix: stored?.slice(0, 15),
        storedLength: stored?.length,
      });
      if (debug) {
        const codes = Array.from(plain || '').map((c) => c.charCodeAt(0));
        dbg('plainCharCodes', codes);
      }
      if (!plain || !stored) {
        dbg('either plain or stored empty');
        return false;
      }
      if (stored.startsWith('$argon2')) {
        const t0 = Date.now();
        const ok = await argon2Verify(stored, plain);
        dbg('argon2.verify', { ok, elapsedMs: Date.now() - t0 });
        return ok;
      }
      if (
        stored.startsWith('$2a$') ||
        stored.startsWith('$2b$') ||
        stored.startsWith('$2y$')
      ) {
        const t0 = Date.now();
        const ok = await bcrypt.compare(plain, stored);
        dbg('bcrypt.compare', { ok, elapsedMs: Date.now() - t0 });
        return ok;
      }
      dbg('unexpected format (comparing as literal)');
      const direct = plain === stored;
      dbg('directStringEquality', direct);
      return direct;
    } catch (err) {
      dbg('error', err);
      return false;
    }
  }

  async registerCustomer(dto: CustomerRegisterDto): Promise<{
    id: string;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    wallet_id: string;
  }> {
    // Basic password strength validation (length + character class diversity)
    this.ensurePasswordStrength(dto.password);
    // Ensure uniqueness on username or email
    const normalizedUsername = dto.username.trim();
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingByUsername = await this.customerRepository.findOne({
      where: { username: normalizedUsername },
    });
    if (existingByUsername) {
      throw new ConflictException('Username already taken');
    }
    const existingByEmail = await this.customerRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (existingByEmail) {
      throw new ConflictException('Email already registered');
    }

    const hashed = await this.hashPassword(dto.password);
    const entity = this.customerRepository.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashed,
      first_name: dto.first_name?.trim(),
      last_name: dto.last_name?.trim(),
    });
    let saved: Customer;
    try {
      saved = await this.customerRepository.save(entity);
    } catch (err: unknown) {
      // Handle potential race condition on unique username/email (Postgres 23505)
      if (
        typeof err === 'object' &&
        err &&
        'code' in err &&
        (err as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Username or email already exists');
      }
      throw err;
    }

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

  // --- Password Strength Helper ---
  private ensurePasswordStrength(password: string) {
    const minLength = 10; // increase if policy requires
    if (!password || password.length < minLength) {
      throw new ConflictException(
        `Password too weak: must be at least ${minLength} characters`,
      );
    }
    const classes = [
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length;
    if (classes < 3) {
      throw new ConflictException(
        'Password too weak: include at least three of lowercase, uppercase, number, symbol',
      );
    }
  }

  // --- Session & Refresh Token Management ---
  async refreshCustomerToken(sessionId: string, refreshToken: string) {
    const refreshTtlDays = Number(
      this.configService.get<string>('CUSTOMER_REFRESH_TTL_DAYS', '30'),
    );
    const { session, refreshToken: newToken } =
      await this.sessionsService.rotate({
        sessionId,
        currentRefreshToken: refreshToken,
        refreshTtlDays,
      });
    // Build new access token
    const customer = await this.customerRepository.findOne({
      where: { id: session.customer_id },
    });
    if (!customer) throw new UnauthorizedException('Customer not found');
    const payload: JwtPayload & { sid: string } = {
      sub: customer.id,
      username: customer.username || customer.email || '',
      type: 'customer',
      sid: session.id,
    };
    const secret =
      this.configService.get<string>('JWT_CUSTOMER_SECRET') ||
      this.configService.get<string>('JWT_SECRET', 'your-secret-key');
    const access_token = this.jwtService.sign(payload, { secret });
    return {
      access_token,
      token_type: 'Bearer',
      expires_in: 86400,
      refresh_token: newToken,
      session_id: session.id,
    };
  }

  async listCustomerSessions(customerId: string) {
    return this.sessionsService.listByCustomer(customerId);
  }

  async revokeCustomerSession(customerId: string, sessionId: string) {
    await this.sessionsService.revoke(sessionId, customerId, 'manual_logout');
    return { session_id: sessionId };
  }

  async revokeOtherCustomerSessions(
    customerId: string,
    currentSessionId: string,
  ) {
    const count = await this.sessionsService.revokeOthers(
      currentSessionId,
      customerId,
    );
    return { revoked: count };
  }

  async revokeAllCustomerSessions(customerId: string) {
    const count = await this.sessionsService.revokeAll(customerId);
    return { revoked: count };
  }
}
