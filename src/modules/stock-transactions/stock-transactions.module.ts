import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockTransactionsController } from './stock-transactions.controller';
import { StockTransactionsService } from './stock-transactions.service';
import { StockTransaction } from './entities/stock-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockTransaction])],
  controllers: [StockTransactionsController],
  providers: [StockTransactionsService],
  exports: [StockTransactionsService],
})
export class StockTransactionsModule {}
