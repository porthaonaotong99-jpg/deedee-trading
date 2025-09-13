import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RoleStatus } from '../../../common/enums';
import { Role } from './role.entity';
import { Permission } from '../../permissions/entities/permission.entity';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({
    type: 'enum',
    enum: RoleStatus,
    default: RoleStatus.ACTIVE,
  })
  status: RoleStatus;

  @Column({ type: 'uuid', nullable: true })
  role_id: string;

  @Column({ type: 'uuid', nullable: true })
  permission_id: string;

  @Column({ type: 'timestamp', nullable: true })
  created_by: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_by: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Role, 'rolePermissions')
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Permission, 'rolePermissions')
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;
}
