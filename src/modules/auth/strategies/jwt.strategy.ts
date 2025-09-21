import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
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

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Dynamically choose which secret to use based on unverified payload "type"
      secretOrKeyProvider: (
        _req: unknown,
        rawJwtToken: string,
        done: (err: Error | null, secret?: string) => void,
      ) => {
        try {
          const parts = rawJwtToken.split('.');
          if (parts.length !== 3) {
            return done(new UnauthorizedException('Malformed token'));
          }
          // Decode base64url payload without verification just to inspect the 'type'
          const payloadJson = Buffer.from(
            parts[1].replace(/-/g, '+').replace(/_/g, '/'),
            'base64',
          ).toString('utf8'); // decode base64url payload
          const payload = JSON.parse(payloadJson) as Partial<
            JwtPayload & { sid?: string }
          >;
          if (payload.type === 'customer') {
            return done(null, customerSecret);
          }
          return done(null, userSecret);
        } catch {
          // Fallback to user secret if inspection fails
          return done(null, userSecret);
        }
      },
    });
    this.userSecret = userSecret;
    this.customerSecret = customerSecret;
  }

  validate(payload: JwtPayload): JwtPayload {
    if (!payload?.type) {
      throw new UnauthorizedException('Invalid token type');
    }
    return {
      sub: payload.sub,
      username: payload.username,
      type: payload.type,
      roleId: payload.roleId,
    } as JwtPayload;
  }
}
