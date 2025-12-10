import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SubscriptionPackage } from './entities/subscription-package.entity';
import { CustomerService } from '../customers/entities/customer-service.entity';
import { SubscriptionPackagesService } from './subscription-packages.service';
import { SubscriptionPackagesController } from './subscription-packages.controller';
import { AdminSubscriptionPackagesController } from './admin-subscription-packages.controller';
import { AdminSubscriptionPackagesService } from './admin-subscription-packages.service';
import { getJwtConfig } from '../../config/jwt.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionPackage, CustomerService]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: getJwtConfig,
      inject: [ConfigService],
    }),
  ],
  controllers: [SubscriptionPackagesController, AdminSubscriptionPackagesController],
  providers: [SubscriptionPackagesService, AdminSubscriptionPackagesService],
  exports: [SubscriptionPackagesService, AdminSubscriptionPackagesService],
})
export class SubscriptionPackagesModule {}
