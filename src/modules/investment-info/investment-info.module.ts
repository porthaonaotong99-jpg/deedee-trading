import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { InvestmentRequest } from './entities/investment-request.entity';
import { CustomerInvestmentSummary } from './entities/customer-investment.entity';
import { InvestmentTransaction } from './entities/investment-transaction.entity';
import { InterestRateConfiguration } from './entities/interest-rate-configuration.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { TransferHistory } from '../transfer-history/entities/transfer-history.entity';
import { CustomerService } from '../customers/entities/customer-service.entity';
import { InterestTierService } from './interest-tier.service';
import { DatabaseInterestRateService } from './database-interest-rate.service';
import { InterestRateAdminController } from './interest-rate-admin.controller';
import { InvestmentService } from './updated-investment.service';
import { NewInvestmentController } from './investment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvestmentRequest,
      CustomerInvestmentSummary,
      InvestmentTransaction,
      InterestRateConfiguration,
      Wallet,
      TransferHistory,
      CustomerService,
    ]),
    ScheduleModule.forRoot(),
  ],
  providers: [
    InvestmentService,
    InterestTierService,
    DatabaseInterestRateService,
  ],
  controllers: [NewInvestmentController, InterestRateAdminController],
  exports: [
    InvestmentService,
    InterestTierService,
    DatabaseInterestRateService,
  ],
})
export class InvestmentInfoModule {}
