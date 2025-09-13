import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerStocksController } from './customer-stocks.controller';
import { CustomerStocksService } from './customer-stocks.service';
import { CustomerStock } from './entities/customer-stock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerStock])],
  controllers: [CustomerStocksController],
  providers: [CustomerStocksService],
  exports: [CustomerStocksService],
})
export class CustomerStocksModule {}
