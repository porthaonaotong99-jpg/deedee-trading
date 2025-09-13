import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserStatus, Gender } from '../../../common/enums';
import { Role } from 'src/modules/roles/entities/role.entity';
import { AuditLog } from 'src/modules/audit-logs/entities/audit-log.entity';
import { TransferHistory } from 'src/modules/transfer-history/entities/transfer-history.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  number: string;

  @Column({ type: 'varchar', nullable: false })
  first_name: string;

  @Column({ type: 'varchar', nullable: true })
  last_name: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  username: string;

  @Column({ type: 'varchar', nullable: false })
  password: string;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: false,
  })
  gender: Gender;

  @Column({ type: 'varchar', unique: true, nullable: true })
  tel: string;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'varchar', nullable: true })
  profile: string;

  @Column({ type: 'uuid', nullable: true })
  role_id: string;

  @Column({ type: 'uuid', nullable: true })
  admin_role_id: string;

  @Column({ type: 'timestamp', nullable: true })
  created_by: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_by: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @OneToMany(() => AuditLog, 'user')
  auditLogs: AuditLog[];

  @OneToMany(() => TransferHistory, 'approvedBy')
  approvedTransfers: TransferHistory[];
}
