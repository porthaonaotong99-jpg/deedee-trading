import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerSession } from './entities/customer-session.entity';
import { SessionsService } from './sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerSession])],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
