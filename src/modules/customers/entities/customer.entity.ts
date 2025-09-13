import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { CustomerStatus } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { AuditLog } from 'src/modules/audit-logs/entities/audit-log.entity';
import { TransferHistory } from 'src/modules/transfer-history/entities/transfer-history.entity';
import { Wallet } from 'src/modules/wallets/entities/wallet.entity';
import { CustomerStock } from 'src/modules/customer-stocks/entities/customer-stock.entity';
import { StockTransaction } from 'src/modules/stock-transactions/entities/stock-transaction.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  first_name: string;

  @Column({ type: 'varchar', nullable: true })
  last_name: string;

  @Column({ type: 'varchar', nullable: true })
  username: string;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ type: 'varchar', nullable: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  @Column({
    type: 'enum',
    enum: CustomerStatus,
    default: CustomerStatus.ACTIVE,
  })
  status: CustomerStatus;

  @Column({ type: 'boolean', default: false })
  isVerify: boolean;

  @Column({ type: 'varchar', nullable: true })
  profile: string;

  @Column({ type: 'varchar', nullable: true })
  identify_front: string;

  @Column({ type: 'varchar', nullable: true })
  identify_back: string;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @Column({ type: 'uuid', nullable: true })
  deleted_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @OneToMany(() => AuditLog, 'customer')
  auditLogs: AuditLog[];

  @OneToMany(() => TransferHistory, 'customer')
  transferHistories: TransferHistory[];

  @OneToOne(() => Wallet, 'customer', { cascade: true })
  wallet: Wallet;

  @OneToMany(() => CustomerStock, 'customer')
  customerStocks: CustomerStock[];

  @OneToMany(() => StockTransaction, 'customer')
  stockTransactions: StockTransaction[];
}
