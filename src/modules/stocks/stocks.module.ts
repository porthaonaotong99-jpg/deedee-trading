import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StocksService } from './stocks.service';
import { StocksController } from './stocks.controller';
import { Stock } from './entities/stock.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerStock } from '../customer-stocks/entities/customer-stock.entity';
import { StockTransaction } from '../stock-transactions/entities/stock-transaction.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { RolePermission } from '../roles/entities/role-permission.entity';
import { UsersService } from '../users/users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Stock,
      Customer,
      CustomerStock,
      StockTransaction,
      Wallet,
      User,
      Role,
      Permission,
      RolePermission,
    ]),
  ],
  controllers: [StocksController],
  providers: [StocksService, UsersService],
  exports: [StocksService],
})
export class StocksModule {}
