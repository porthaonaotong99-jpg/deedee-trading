import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StocksService } from './stocks.service';
import { StocksController } from './stocks.controller';
import { StockQuotesController } from './quotes.controller';
import { TechnicalIndicatorsController } from './controllers/technical-indicators.controller';
import { Stock } from './entities/stock.entity';
import { StockPriceHistory } from './entities/stock-price-history.entity';
import { StockCategory } from '../stock-categories/entities/stock-category.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerStock } from '../customer-stocks/entities/customer-stock.entity';
import { StockTransaction } from '../stock-transactions/entities/stock-transaction.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { RolePermission } from '../roles/entities/role-permission.entity';
import { UsersService } from '../users/users.service';
import { RealTimePriceService } from './services/real-time-price.service';
import { StockPricesGateway } from './gateways/stock-prices.gateway';
import { ExternalPriceFetcherService } from './services/external-price-fetcher.service';
import { StockMetadataService } from './services/stock-metadata.service';
import { TechnicalIndicatorsService } from './services/technical-indicators.service';
import { QuotesService } from './services/quotes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Stock,
      StockPriceHistory,
      Customer,
      CustomerStock,
      StockTransaction,
      Wallet,
      User,
      Role,
      Permission,
      RolePermission,
      StockCategory,
    ]),
  ],
  controllers: [
    StocksController,
    StockQuotesController,
    TechnicalIndicatorsController,
  ],
  providers: [
    StocksService,
    UsersService,
    ExternalPriceFetcherService,
    QuotesService,
    StockMetadataService,
    TechnicalIndicatorsService,
    // Use forwardRef wrappers only if needed for circular resolution
    RealTimePriceService,
    StockPricesGateway,
  ],
  exports: [
    StocksService,
    RealTimePriceService,
    ExternalPriceFetcherService,
    QuotesService,
    StockMetadataService,
  ],
})
export class StocksModule {}
