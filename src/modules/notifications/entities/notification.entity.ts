import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import {
  NotificationCategory,
  NotificationAction,
  NotificationRecipientType,
} from '../interfaces/notification.interface';

@Entity('notifications')
@Index(['recipientId', 'isRead'])
@Index(['recipientId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationCategory,
    nullable: false,
  })
  category: NotificationCategory;

  @Column({
    type: 'enum',
    enum: NotificationAction,
    nullable: false,
  })
  action: NotificationAction;

  @Column({
    type: 'enum',
    enum: NotificationRecipientType,
    nullable: false,
  })
  recipientType: NotificationRecipientType;

  @Column({ type: 'varchar', nullable: false })
  @Index()
  recipientId: string;

  @Column({ type: 'varchar', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  message: string;

  @Column({ type: 'jsonb', nullable: false })
  metadata: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'varchar', nullable: true })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;
}
