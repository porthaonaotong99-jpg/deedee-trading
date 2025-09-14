import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('customer_sessions')
@Index(['customer_id'])
export class CustomerSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  customer_id!: string;

  @Column({ type: 'text', nullable: true })
  user_agent?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip_address?: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  device_id?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  device_name?: string;

  @Column({ type: 'text' })
  refresh_token_hash!: string;

  @Column({ type: 'timestamptz' })
  refresh_expires_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_activity_at?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  revoked_reason?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
