import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomersController } from './customers.controller';
import { CustomerServicesController } from './customer-services.controller';

import { CustomersService } from './customers.service';

import { Customer } from './entities/customer.entity';
import { CustomerService } from './entities/customer-service.entity';
import { CustomerKyc } from './entities/customer-kyc.entity';
import { CustomerDocument } from './entities/customer-document.entity';
import { CustomerAddress } from './entities/customer-address.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { Payment } from './entities/payment.entity';
import { PaymentAuditLog } from './entities/payment-audit-log.entity';
import { SubscriptionPackage } from './entities/subscription-package.entity';
import { CustomerKycServiceUsage } from './entities/customer-kyc-service-usage.entity';
import { NodemailerEmailService } from './services/email.service';
import { MockPaymentService } from './services/payment.service';
import { SubscriptionSchedulerService } from './services/subscription-scheduler.service';
import { PaymentRecordService } from './services/payment-record.service';
import { PaymentAuditService } from './services/payment-audit.service';
import { getJwtConfig } from '../../config/jwt.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CustomerService,
      CustomerKyc,
      CustomerDocument,
      CustomerAddress,
      PasswordReset,
      Payment,
      PaymentAuditLog,
      SubscriptionPackage,
      CustomerKycServiceUsage,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: getJwtConfig,
      inject: [ConfigService],
    }),
  ],
  controllers: [CustomersController, CustomerServicesController],
  providers: [
    CustomersService,
    {
      provide: 'EmailService',
      useClass: NodemailerEmailService,
    },
    {
      provide: 'PaymentService',
      useClass: MockPaymentService,
    },
    PaymentRecordService,
    PaymentAuditService,
    SubscriptionSchedulerService,
  ],
  exports: [CustomersService],
})
export class CustomersModule {}
