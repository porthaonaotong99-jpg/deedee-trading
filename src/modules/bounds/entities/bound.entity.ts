import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BoundStatus } from '../../../common/enums';
import { InvestType } from '../../invest-types/entities/invest-type.entity';

@Entity('bounds')
export class Bound {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({
    type: 'enum',
    enum: BoundStatus,
    default: BoundStatus.ACTIVE,
  })
  status: BoundStatus;

  @Column({ type: 'uuid', nullable: true })
  invest_type: string;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @Column({ type: 'uuid', nullable: true })
  deleted_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => InvestType, 'bounds')
  @JoinColumn({ name: 'invest_type' })
  investType: InvestType;
}
