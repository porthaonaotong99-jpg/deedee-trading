import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtUserStrategy } from './strategies/jwt-user.strategy';
import { JwtCustomerStrategy } from './strategies/jwt-customer.strategy';
import { User } from '../users/entities/user.entity';
import { Customer } from '../customers/entities/customer.entity';
import { getJwtConfig } from '../../config/jwt.config';
import { WalletsModule } from '../wallets/wallets.module';
import { SessionsModule } from '../sessions/sessions.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Customer]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: getJwtConfig,
      inject: [ConfigService],
    }),
    WalletsModule,
    SessionsModule,
    CustomersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtUserStrategy, JwtCustomerStrategy],
  exports: [AuthService],
})
export class AuthModule {}
