import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { InvestmentTransaction } from '../investment-info/entities/investment-transaction.entity';
import { InvestmentRequest } from '../investment-info/entities/investment-request.entity';
import { CustomerStock } from '../customer-stocks/entities/customer-stock.entity';
import { Customer } from '../customers/entities/customer.entity';
import { User } from '../users/entities/user.entity';
import { TransferHistory } from '../transfer-history/entities/transfer-history.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { CustomerKyc } from '../customers/entities/customer-kyc.entity';
import { StockPick } from '../stock-picks/entities/stock-pick.entity';
import { CustomerService } from '../customers/entities/customer-service.entity';
import { StockTransaction } from '../stock-transactions/entities/stock-transaction.entity';
import { CustomerStockPick } from '../stock-picks/entities/customer-stock-pick.entity';
import { Payment } from '../payments/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvestmentTransaction,
      InvestmentRequest,
      CustomerStock,
      Customer,
      User,
      TransferHistory,
      Wallet,
      CustomerKyc,
      StockPick,
      CustomerService,
      StockTransaction,
      CustomerStockPick,
      Payment,
    ]),
  ],
  controllers: [DashboardController, AdminDashboardController],
  providers: [DashboardService, AdminDashboardService],
  exports: [DashboardService, AdminDashboardService],
})
export class DashboardModule {}
