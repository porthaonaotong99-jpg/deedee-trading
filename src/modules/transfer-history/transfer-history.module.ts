import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminTransferHistoryController } from './controllers/admin-transfer-history.controller';
import { CustomerTransferHistoryController } from './controllers/customer-transfer-history.controller';
import { TransferHistoryService } from './transfer-history.service';
import { TransferHistory } from './entities/transfer-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TransferHistory])],
  controllers: [
    AdminTransferHistoryController,
    CustomerTransferHistoryController,
  ],
  providers: [TransferHistoryService],
  exports: [TransferHistoryService],
})
export class TransferHistoryModule {}
