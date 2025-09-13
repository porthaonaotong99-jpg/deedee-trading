import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bound } from './entities/bound.entity';
import { BoundsService } from './bounds.service';
import { BoundsController } from './bounds.controller';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { InvestType } from '../invest-types/entities/invest-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bound, InvestType, User, Permission])],
  controllers: [BoundsController],
  providers: [BoundsService, UsersService],
  exports: [BoundsService],
})
export class BoundsModule {}
