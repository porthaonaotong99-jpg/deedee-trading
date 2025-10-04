import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Customer } from './customer.entity';

export enum PasswordResetType {
  EMAIL_LINK = 'email_link',
  EMAIL_OTP = 'email_otp',
}

export enum PasswordResetStatus {
  PENDING = 'pending',
  USED = 'used',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

@Entity('password_resets')
@Index('idx_password_resets_email_status', ['email', 'status'])
@Index('idx_password_resets_token_hash', ['token_hash'], { unique: true })
@Index('idx_password_resets_expires_at', ['expires_at'])
export class PasswordReset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'varchar', nullable: false })
  email: string;

  @Column({
    type: 'enum',
    enum: PasswordResetType,
    default: PasswordResetType.EMAIL_OTP,
  })
  reset_type: PasswordResetType;

  @Column({
    type: 'enum',
    enum: PasswordResetStatus,
    default: PasswordResetStatus.PENDING,
  })
  status: PasswordResetStatus;

  // Hashed version of the token/OTP for security
  @Column({ type: 'varchar', nullable: false })
  token_hash: string;

  // For rate limiting: track attempts
  @Column({ type: 'integer', default: 0 })
  attempt_count: number;

  @Column({ type: 'integer', default: 3 })
  max_attempts: number;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  used_at: Date | null;

  @Column({ type: 'varchar', nullable: true })
  user_agent: string | null;

  @Column({ type: 'inet', nullable: true })
  ip_address: string | null;

  @CreateDateColumn()
  created_at: Date;
}
