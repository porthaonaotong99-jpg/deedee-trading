import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DistrictStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('district')
export class District {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'int', nullable: true })
  postcode: number;

  @Column({ type: 'uuid', nullable: false })
  province_id: string;

  @Column({
    type: 'enum',
    enum: DistrictStatus,
    default: DistrictStatus.ACTIVE,
  })
  status: DistrictStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
