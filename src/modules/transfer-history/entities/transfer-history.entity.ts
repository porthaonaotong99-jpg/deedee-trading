import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TransferIdentify, TransferStatus } from '../../../common/enums';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';

@Entity('transfer_history')
export class TransferHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TransferIdentify,
    nullable: false,
  })
  identify: TransferIdentify;

  @Column({ type: 'double precision', nullable: false })
  amount: number;

  @Column({ type: 'varchar', nullable: true })
  payment_slip: string;

  @Column({
    type: 'enum',
    enum: TransferStatus,
    default: TransferStatus.PENDING,
  })
  status: TransferStatus;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string;

  @Column({ type: 'uuid', nullable: true })
  rejected_by: string;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Customer, 'transferHistories')
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => User, 'approvedTransfers', { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedBy: User;
}
