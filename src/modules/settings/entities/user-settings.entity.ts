import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Notification Preferences
  @Column({ type: 'boolean', default: true })
  notify_new_customers: boolean;

  @Column({ type: 'boolean', default: true })
  notify_payments: boolean;

  @Column({ type: 'boolean', default: true })
  notify_investments: boolean;

  @Column({ type: 'boolean', default: true })
  notify_stock_activity: boolean;

  @Column({ type: 'boolean', default: true })
  notify_system_alerts: boolean;

  @Column({ type: 'boolean', default: false })
  notify_email: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
