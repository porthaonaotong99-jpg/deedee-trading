import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockCategory } from './entities/stock-category.entity';
import { StockCategoriesService } from './stock-categories.service';
import { StockCategoriesController } from './stock-categories.controller';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Permission } from '../permissions/entities/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockCategory, User, Permission])],
  controllers: [StockCategoriesController],
  providers: [StockCategoriesService, UsersService],
  exports: [StockCategoriesService],
})
export class StockCategoriesModule {}
