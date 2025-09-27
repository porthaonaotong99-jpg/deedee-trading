import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { StockDataDemoService } from './stock-data-demo.service';
import { StocksModule } from '../modules/stocks/stocks.module';

@Module({
  imports: [StocksModule],
  controllers: [DemoController],
  providers: [StockDataDemoService],
  exports: [StockDataDemoService],
})
export class DemoModule {}
