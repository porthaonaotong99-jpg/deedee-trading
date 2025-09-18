import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersController } from './customers.controller';
import { CustomerServicesController } from './customer-services.controller';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { CustomerService } from './entities/customer-service.entity';
import { CustomerKyc } from './entities/customer-kyc.entity';
import { CustomerDocument } from './entities/customer-document.entity';
import { CustomerAddress } from './entities/customer-address.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CustomerService,
      CustomerKyc,
      CustomerDocument,
      CustomerAddress,
    ]),
  ],
  controllers: [CustomersController, CustomerServicesController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
