import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ProvinceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('province')
export class Province {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'uuid', nullable: false })
  country_id: string;

  @Column({
    type: 'enum',
    enum: ProvinceStatus,
    default: ProvinceStatus.ACTIVE,
  })
  status: ProvinceStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
