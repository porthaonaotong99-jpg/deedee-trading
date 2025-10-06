import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestmentInfo } from './entities/investment-info.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { TransferHistory } from '../transfer-history/entities/transfer-history.entity';
import { CustomerService } from '../customers/entities/customer-service.entity';
import { InvestmentInfoService } from './investment-info.service';
import { InvestmentInfoController } from './investment-info.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvestmentInfo,
      Wallet,
      TransferHistory,
      CustomerService,
    ]),
  ],
  providers: [InvestmentInfoService],
  controllers: [InvestmentInfoController],
  exports: [InvestmentInfoService],
})
export class InvestmentInfoModule {}
