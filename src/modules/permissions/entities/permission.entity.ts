import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PermissionStatus } from '../../../common/enums';
import { RolePermission } from '../../roles/entities/role-permission.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  group_name: string;

  @Column({
    type: 'enum',
    enum: PermissionStatus,
    default: PermissionStatus.ACTIVE,
  })
  status: PermissionStatus;

  @Column({ type: 'timestamp', nullable: true })
  created_by: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_by: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @OneToMany(() => RolePermission, 'permission')
  rolePermissions: RolePermission[];
}
