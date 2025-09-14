import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerSession } from './entities/customer-session.entity';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

// Minimal typed adapter (reuse pattern from AuthService)
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
const _argon2 = argon2 as unknown as Argon2Adapter;
const argon2id = _argon2.argon2id;
const argon2Hash = (
  password: string | Buffer,
  options?: Parameters<Argon2Adapter['hash']>[1],
) => _argon2.hash(password, options);
const argon2Verify = (hash: string | Buffer, password: string | Buffer) =>
  _argon2.verify(hash, password);

interface CreateSessionInput {
  customerId: string;
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
  deviceName?: string;
  metadata?: Record<string, unknown>;
  country?: string;
  province?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  geo_location?: Record<string, unknown>;
  refreshTtlDays: number;
}

interface RotateSessionInput {
  sessionId: string;
  currentRefreshToken: string;
  refreshTtlDays: number;
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(CustomerSession)
    private readonly repo: Repository<CustomerSession>,
  ) {}

  private async hash(value: string) {
    const hashed = await argon2Hash(value, { type: argon2id });
    return hashed;
  }

  private async verify(hash: string, value: string) {
    return argon2Verify(hash, value);
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  async create(input: CreateSessionInput) {
    // Try to find existing session for this customer/device
    const session = await this.repo.findOne({
      where: {
        customer_id: input.customerId,
        device_id: input.deviceId,
        revoked_at: undefined,
      },
    });
    const rawToken = this.generateRefreshToken();
    const refresh_token_hash = await this.hash(rawToken);
    const refresh_expires_at = new Date(
      Date.now() + input.refreshTtlDays * 86400000,
    );
    if (session) {
      // Update existing session with latest info
      session.user_agent = input.userAgent;
      session.ip_address = input.ipAddress;
      session.device_name = input.deviceName;
      session.metadata = input.metadata;
      session.country = input.country;
      session.province = input.province;
      session.district = input.district;
      session.latitude = input.latitude;
      session.longitude = input.longitude;
      session.geo_location = input.geo_location;
      session.refresh_token_hash = refresh_token_hash;
      session.refresh_expires_at = refresh_expires_at;
      session.last_activity_at = new Date();
      await this.repo.save(session);
      return { session, refreshToken: rawToken };
    } else {
      // Create new session
      const entity = this.repo.create({
        customer_id: input.customerId,
        user_agent: input.userAgent,
        ip_address: input.ipAddress,
        device_id: input.deviceId,
        device_name: input.deviceName,
        metadata: input.metadata,
        country: input.country,
        province: input.province,
        district: input.district,
        latitude: input.latitude,
        longitude: input.longitude,
        geo_location: input.geo_location,
        last_activity_at: new Date(),
        refresh_token_hash,
        refresh_expires_at,
      });
      const saved = await this.repo.save(entity);
      return { session: saved, refreshToken: rawToken };
    }
  }

  async findById(id: string) {
    const session = await this.repo.findOne({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async listByCustomer(customerId: string) {
    return this.repo.find({
      where: { customer_id: customerId },
      order: { created_at: 'DESC' },
    });
  }

  async rotate(input: RotateSessionInput) {
    const session = await this.findById(input.sessionId);
    if (session.revoked_at) throw new ForbiddenException('Session revoked');
    if (session.refresh_expires_at.getTime() < Date.now()) {
      throw new ForbiddenException('Session expired');
    }
    const valid = await this.verify(
      session.refresh_token_hash,
      input.currentRefreshToken,
    );
    if (!valid) {
      // Optional: revoke session on suspected token reuse
      session.revoked_at = new Date();
      session.revoked_reason = 'refresh_token_reuse_or_invalid';
      await this.repo.save(session);
      throw new ForbiddenException('Invalid refresh token');
    }
    // Rotate
    const newToken = this.generateRefreshToken();
    session.refresh_token_hash = await this.hash(newToken);
    session.refresh_expires_at = new Date(
      Date.now() + input.refreshTtlDays * 86400000,
    );
    await this.repo.save(session);
    return { session, refreshToken: newToken };
  }

  async updateActivity(sessionId: string) {
    await this.repo.update(sessionId, { last_activity_at: new Date() });
  }

  async revoke(
    sessionId: string,
    customerId: string,
    reason = 'manual_logout',
  ) {
    const session = await this.findById(sessionId);
    if (session.customer_id !== customerId)
      throw new ForbiddenException('Not allowed');
    if (!session.revoked_at) {
      session.revoked_at = new Date();
      session.revoked_reason = reason;
      await this.repo.save(session);
    }
    return session;
  }

  async revokeOthers(currentSessionId: string, customerId: string) {
    const sessions = await this.listByCustomer(customerId);
    const others = sessions.filter(
      (s) => s.id !== currentSessionId && !s.revoked_at,
    );
    for (const s of others) {
      s.revoked_at = new Date();
      s.revoked_reason = 'logout_others';
    }
    if (others.length) await this.repo.save(others);
    return others.length;
  }

  async revokeAll(customerId: string) {
    const sessions = await this.listByCustomer(customerId);
    const active = sessions.filter((s) => !s.revoked_at);
    for (const s of active) {
      s.revoked_at = new Date();
      s.revoked_reason = 'logout_all';
    }
    if (active.length) await this.repo.save(active);
    return active.length;
  }
}
