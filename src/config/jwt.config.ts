import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

// Legacy single-secret config kept for backwards compatibility with JwtModule
export const getJwtConfig = (
  configService: ConfigService,
): JwtModuleOptions => ({
  secret:
    configService.get<string>('JWT_USER_SECRET') ||
    configService.get<string>('JWT_CUSTOMER_SECRET', 'your-secret-key'),
  signOptions: {
    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
  },
});

// Helper to retrieve distinct secrets for manual signing / verification
export const getJwtSecrets = (configService: ConfigService) => ({
  userSecret:
    configService.get<string>('JWT_USER_SECRET') ||
    configService.get<string>('JWT_CUSTOMER_SECRET', 'your-secret-key'),
  customerSecret:
    configService.get<string>('JWT_CUSTOMER_SECRET') ||
    configService.get<string>('JWT_CUSTOMER_SECRET', 'your-secret-key'),
  expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
});

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}
