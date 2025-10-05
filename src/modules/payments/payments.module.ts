import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentAuditLog } from './entities/payment-audit-log.entity';
import { CustomerService } from '../customers/entities/customer-service.entity';
import { PaymentService } from './services/payment.service';
import { PaymentRecordService } from './services/payment-record.service';
import { PaymentAuditService } from './services/payment-audit.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentAuditLog, CustomerService]),
  ],
  providers: [
    { provide: 'PaymentService', useClass: PaymentService },
    PaymentRecordService,
    PaymentAuditService,
  ],
  exports: ['PaymentService', PaymentRecordService, PaymentAuditService],
})
export class PaymentsModule {}
