import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CustomerServiceType } from '../../customers/entities/customer-service.entity';
import { Permission } from './permission.entity';

@Entity('service_permissions')
export class ServicePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: CustomerServiceType })
  service_type: CustomerServiceType;

  @Column({ type: 'varchar' })
  permission_name: string;

  @ManyToOne(() => Permission, { nullable: false })
  @JoinColumn({ name: 'permission_name', referencedColumnName: 'name' })
  permission: Permission;
}
