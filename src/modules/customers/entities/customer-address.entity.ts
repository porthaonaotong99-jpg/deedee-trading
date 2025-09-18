import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customer_addresses')
@Index(['customer_id', 'is_primary'])
export class CustomerAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'uuid', nullable: true })
  country_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  province_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  district_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  village: string | null;

  @Column({ type: 'varchar', nullable: true })
  address_line: string | null;

  @Column({ type: 'varchar', nullable: true })
  postal_code: string | null;

  @Column({ type: 'boolean', default: true })
  is_primary: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
