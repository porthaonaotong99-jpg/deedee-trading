import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  Index,
} from 'typeorm';
import { CustomerStatus } from '../../../common/enums';
import { AuditLog } from 'src/modules/audit-logs/entities/audit-log.entity';
import { TransferHistory } from 'src/modules/transfer-history/entities/transfer-history.entity';
import { Wallet } from 'src/modules/wallets/entities/wallet.entity';
import { CustomerStock } from 'src/modules/customer-stocks/entities/customer-stock.entity';
import { StockTransaction } from 'src/modules/stock-transactions/entities/stock-transaction.entity';
import { CustomerKyc } from './customer-kyc.entity';
import { CustomerDocument } from './customer-document.entity';
import { CustomerAddress } from './customer-address.entity';

@Entity('customers')
@Index('uq_customers_username', ['username'], { unique: true })
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  first_name: string;

  @Column({ type: 'varchar', nullable: true })
  last_name: string;

  @Column({ type: 'varchar', nullable: false })
  username: string; // uniqueness enforced by uq_customers_username index

  @Column({ type: 'varchar', nullable: false })
  password: string;

  @Column({ type: 'varchar', nullable: false })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone_number: string;

  // (All extended KYC, address & document fields moved to their own tables)

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

  // Identity document references moved to customer_documents

  @Column({ type: 'uuid', nullable: true })
  deleted_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
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

  // New split relations
  @OneToMany(() => CustomerKyc, (kyc) => kyc.customer)
  kycRecords: CustomerKyc[];

  @OneToMany(() => CustomerDocument, (doc) => doc.customer)
  documents: CustomerDocument[];

  @OneToMany(() => CustomerAddress, (addr) => addr.customer)
  addresses: CustomerAddress[];
}
