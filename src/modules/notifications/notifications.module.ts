import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { AdminNotificationsController } from './notifications.controller';
import { CustomerNotificationsController } from './customer-notifications.controller';
import { Notification } from './entities/notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  providers: [NotificationsService, NotificationsGateway],
  controllers: [AdminNotificationsController, CustomerNotificationsController],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
