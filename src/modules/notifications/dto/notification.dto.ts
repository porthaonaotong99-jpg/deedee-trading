import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  NotificationCategory,
  NotificationAction,
  NotificationRecipientType,
} from '../interfaces/notification.interface';
import type { NotificationMetadata } from '../interfaces/notification.interface';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationCategory })
  @IsEnum(NotificationCategory)
  @IsNotEmpty()
  category: NotificationCategory;

  @ApiProperty({ enum: NotificationAction })
  @IsEnum(NotificationAction)
  @IsNotEmpty()
  action: NotificationAction;

  @ApiProperty({ enum: NotificationRecipientType })
  @IsEnum(NotificationRecipientType)
  @IsNotEmpty()
  recipientType: NotificationRecipientType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsNotEmpty()
  metadata: NotificationMetadata;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  createdBy?: string;
}

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationCategory })
  category: NotificationCategory;

  @ApiProperty({ enum: NotificationAction })
  action: NotificationAction;

  @ApiProperty({ enum: NotificationRecipientType })
  recipientType: NotificationRecipientType;

  @ApiProperty()
  recipientId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata: NotificationMetadata;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  createdBy?: string;
}
