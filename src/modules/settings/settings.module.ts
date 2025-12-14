import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { UserSettings } from './entities/user-settings.entity';
import { SystemSettings } from './entities/system-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserSettings, SystemSettings])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
