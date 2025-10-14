import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { InvestmentTransaction } from '../investment-info/entities/investment-transaction.entity';
import { CustomerStock } from '../customer-stocks/entities/customer-stock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InvestmentTransaction, CustomerStock])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
