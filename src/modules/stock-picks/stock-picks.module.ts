import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerService } from '../customers/entities/customer-service.entity';
import { StockPicksService } from './services/stock-picks.service';
import { AdminStockPicksController } from './controllers/admin-stock-picks.controller';
import { CustomerStockPicksController } from './controllers/customer-stock-picks.controller';
import { NodemailerEmailService } from './services/email.service';
import { StockPick } from './entities/stock-pick.entity';
import { CustomerStockPick } from './entities/customer-stock-pick.entity';
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      StockPick,
      CustomerStockPick,
      Customer,
      CustomerService,
    ]),
  ],
  controllers: [AdminStockPicksController, CustomerStockPicksController],
  providers: [StockPicksService, NodemailerEmailService],
  exports: [StockPicksService, NodemailerEmailService],
})
export class StockPicksModule {}
