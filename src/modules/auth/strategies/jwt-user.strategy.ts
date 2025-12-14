import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../../common/interfaces';

// Extended payload that may include 2FA pending tokens
interface ExtendedJwtPayload extends Omit<JwtPayload, 'type'> {
  type: string;
}

@Injectable()
export class JwtUserStrategy extends PassportStrategy(Strategy, 'jwt-user') {
  private readonly secret: string;
  constructor(private readonly config: ConfigService) {
    const fallback = config.get<string>('JWT_SECRET', 'your-secret-key');
    const secret = config.get<string>('JWT_ADMIN_SECRET') || fallback;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    this.secret = secret;
  }

  validate(payload: ExtendedJwtPayload): JwtPayload {
    // SECURITY: Reject 2FA pending tokens - these are NOT valid access tokens
    // Users with 2FA enabled MUST complete 2FA verification to get a real access token
    if (payload.type === '2fa_pending') {
      throw new UnauthorizedException(
        'Two-factor authentication required. Please complete 2FA verification.',
      );
    }

    // Only allow fully authenticated user tokens
    if (payload.type !== 'user') {
      throw new UnauthorizedException('Invalid token type for user route');
    }

    // Cast back to JwtPayload since we've validated the type
    return payload as unknown as JwtPayload;
  }
}
