import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferHistoryController } from './transfer-history.controller';
import { TransferHistoryService } from './transfer-history.service';
import { TransferHistory } from './entities/transfer-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TransferHistory])],
  controllers: [TransferHistoryController],
  providers: [TransferHistoryService],
  exports: [TransferHistoryService],
})
export class TransferHistoryModule {}
