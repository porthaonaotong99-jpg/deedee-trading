import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InteractiveBrokersService } from './services/interactive-brokers.service';

@Module({
  imports: [ConfigModule],
  providers: [InteractiveBrokersService],
  exports: [InteractiveBrokersService],
})
export class InteractiveBrokersModule {}
