import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestType } from './entities/invest-type.entity';
import { InvestTypesService } from './invest-types.service';
import { InvestTypesController } from './invest-types.controller';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Permission } from '../permissions/entities/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InvestType, User, Permission])],
  controllers: [InvestTypesController],
  providers: [InvestTypesService, UsersService],
  exports: [InvestTypesService],
})
export class InvestTypesModule {}
