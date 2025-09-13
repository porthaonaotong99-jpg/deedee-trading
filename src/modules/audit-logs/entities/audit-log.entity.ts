import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditLogStatus } from '../../../common/enums';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  action: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: AuditLogStatus,
    nullable: true,
  })
  status: AuditLogStatus;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Store success message from backend or server',
  })
  on_success: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Store error message from backend or server',
  })
  on_error: string;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string;

  @Column({ type: 'uuid', nullable: true })
  user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Customer, 'auditLogs', { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => User, 'auditLogs', { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
