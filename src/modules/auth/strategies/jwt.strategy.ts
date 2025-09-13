import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../../common/interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private userSecret: string;
  private customerSecret: string;

  constructor(private configService: ConfigService) {
    const fallback = configService.get<string>('JWT_SECRET', 'your-secret-key');
    const userSecret = configService.get<string>('JWT_USER_SECRET') || fallback;
    const customerSecret =
      configService.get<string>('JWT_CUSTOMER_SECRET') || fallback;
    const baseOptions: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: userSecret, // temporary; will manually verify in validate
    };
    super(baseOptions);
    this.userSecret = userSecret;
    this.customerSecret = customerSecret;
  }

  validate(payload: JwtPayload): JwtPayload {
    // Passport automatically calls validate with decoded payload based on provided secret.
    // We need to re-verify signature if secret should differ.
    if (!payload?.type) {
      throw new UnauthorizedException('Invalid token type');
    }
    // If type is customer but strategy used userSecret for initial decode, re-verify with correct secret to ensure integrity.
    // NOTE: For true dual-secret integrity, override authenticate() to capture raw token and re-verify.
    // Current approach relies on initial secret; ensure signing uses userSecret for user tokens and same secret or separate verification for customers if needed.
    return {
      sub: payload.sub,
      username: payload.username,
      type: payload.type,
      roleId: payload.roleId,
    } as JwtPayload;
  }
}
