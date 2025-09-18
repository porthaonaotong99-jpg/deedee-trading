import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { CustomerKyc } from './customer-kyc.entity';

export enum CustomerDocumentType {
  IDENTITY_FRONT = 'identity_front',
  IDENTITY_BACK = 'identity_back',
  PASSPORT = 'passport',
  BANK_STATEMENT = 'bank_statement',
  ADDRESS_PROOF = 'address_proof',
  SELFIE = 'selfie',
}

@Entity('customer_documents')
@Index(['customer_id', 'doc_type'])
export class CustomerDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'uuid', nullable: true })
  kyc_id: string | null;

  @ManyToOne(() => CustomerKyc, { nullable: true })
  @JoinColumn({ name: 'kyc_id' })
  kyc: CustomerKyc | null;

  @Column({ type: 'enum', enum: CustomerDocumentType })
  doc_type: CustomerDocumentType;

  @Column({ type: 'varchar' })
  storage_ref: string; // path, key or external URI

  @Column({ type: 'varchar', nullable: true })
  checksum: string | null; // sha256 hex or similar

  @Column({ type: 'boolean', default: false })
  encrypted: boolean;

  @Column({ type: 'varchar', nullable: true })
  encryption_scheme: string | null; // e.g. aes-256-gcm:v1

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null; // width/height/mime

  @CreateDateColumn()
  created_at: Date;
}
