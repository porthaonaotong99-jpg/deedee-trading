import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InteractiveBrokersService } from './services/interactive-brokers.service';
import { InteractiveBrokersController } from './interactive-brokers.controller';

@Module({
  imports: [ConfigModule],
  controllers: [InteractiveBrokersController],
  providers: [InteractiveBrokersService],
  exports: [InteractiveBrokersService],
})
export class InteractiveBrokersModule {}
