import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { InvestTypeStatus } from '../../../common/enums';
import { Bound } from '../../bounds/entities/bound.entity';

@Entity('invest_types')
export class InvestType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'float', nullable: true })
  amount: number;

  @Column({ type: 'float', nullable: true })
  profit: number;

  @Column({ type: 'float', nullable: true })
  change: number;

  @Column({
    type: 'enum',
    enum: InvestTypeStatus,
    default: InvestTypeStatus.ACTIVE,
  })
  status: InvestTypeStatus;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @Column({ type: 'uuid', nullable: true })
  deleted_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @OneToMany(() => Bound, 'investType')
  bounds: Bound[];
}
