import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Customer } from './entities/customer.entity';
import {
  CustomerService,
  CustomerServiceType,
} from './entities/customer-service.entity';
import {
  CustomerKyc,
  KycLevel,
  KycStatus,
} from './entities/customer-kyc.entity';
import { CustomerAddress } from './entities/customer-address.entity';
import {
  CustomerDocument,
  CustomerDocumentType,
} from './entities/customer-document.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

interface CreateCustomerDto {
  username: string;
  email: string;
  password: string;
}
interface UpdateCustomerDto {
  username?: string;
  email?: string;
  password?: string;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
    @InjectRepository(CustomerService)
    private readonly customerServiceRepo: Repository<CustomerService>,
    @InjectRepository(CustomerKyc)
    private readonly customerKycRepo: Repository<CustomerKyc>,
    @InjectRepository(CustomerAddress)
    private readonly customerAddressRepo: Repository<CustomerAddress>,
    @InjectRepository(CustomerDocument)
    private readonly customerDocumentRepo: Repository<CustomerDocument>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateCustomerDto) {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async findAll(query: PaginationQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const [data, total] = await this.repo.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      order: { created_at: 'DESC' },
    });
    const totalPages = Math.ceil(total / limit) || 1;
    return { data, total, page, limit, totalPages };
  }

  async findOne(id: string) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Customer not found');
    return entity;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: string) {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
  }

  // --- Service Application Logic ---

  private kycLevelOrder(level: KycLevel): number {
    switch (level) {
      case KycLevel.BASIC:
        return 1;
      case KycLevel.ADVANCED:
        return 2;
      case KycLevel.BROKERAGE:
        return 3;
      default:
        return 0;
    }
  }

  private requiredConfig: Record<
    CustomerServiceType,
    {
      level: KycLevel;
      requiredFields: (keyof CustomerKyc)[];
      requiredDocs: CustomerDocumentType[];
    }
  > = {
    [CustomerServiceType.PREMIUM_MEMBERSHIP]: {
      level: KycLevel.BASIC,
      requiredFields: [],
      requiredDocs: [],
    },
    [CustomerServiceType.PREMIUM_STOCK_PICKS]: {
      level: KycLevel.BASIC,
      requiredFields: [],
      requiredDocs: [],
    },
    [CustomerServiceType.INTERNATIONAL_STOCK_ACCOUNT]: {
      level: KycLevel.BROKERAGE,
      requiredFields: [
        'dob',
        'nationality',
        'employment_status',
        'annual_income',
        'investment_experience',
        'source_of_funds',
        'risk_tolerance',
      ],
      requiredDocs: [
        CustomerDocumentType.IDENTITY_FRONT,
        CustomerDocumentType.IDENTITY_BACK,
        CustomerDocumentType.BANK_STATEMENT,
      ],
    },
    [CustomerServiceType.GUARANTEED_RETURNS]: {
      level: KycLevel.ADVANCED,
      requiredFields: [
        'dob',
        'nationality',
        'employment_status',
        'annual_income',
        'investment_experience',
      ],
      requiredDocs: [
        CustomerDocumentType.IDENTITY_FRONT,
        CustomerDocumentType.IDENTITY_BACK,
        CustomerDocumentType.BANK_STATEMENT,
      ],
    },
  };

  async listServices(customerId: string) {
    return this.customerServiceRepo.find({
      where: { customer_id: customerId },
    });
  }

  async applyService(
    customerId: string,
    serviceType: CustomerServiceType,
    payload?: {
      kyc?: Partial<CustomerKyc>;
      address?: {
        country_id?: string;
        province_id?: string;
        district_id?: string;
        village?: string;
        address_line?: string;
        postal_code?: string;
      };
      documents?: {
        doc_type: CustomerDocumentType;
        storage_ref: string;
        checksum?: string;
      }[];
    },
  ) {
    // 1. Early idempotency check (outside transaction for fast path)
    const existing = await this.customerServiceRepo.findOne({
      where: { customer_id: customerId, service_type: serviceType },
    });
    if (existing) {
      return { service: existing, status: 'already_active' };
    }

    // 2. Configuration lookup
    const cfg = this.requiredConfig[serviceType];
    if (!cfg) throw new BadRequestException('Unsupported service');

    // 3. Fetch existing approved KYCs & determine sufficiency
    const kycs = await this.customerKycRepo.find({
      where: { customer_id: customerId, status: KycStatus.APPROVED },
      order: { created_at: 'DESC' },
    });
    const sufficient = kycs.find(
      (k) => this.kycLevelOrder(k.kyc_level) >= this.kycLevelOrder(cfg.level),
    );
    const needsNewKyc = !sufficient;

    // 4. Pre-validate KYC fields if a new KYC will be needed
    if (needsNewKyc) {
      if (!payload?.kyc) {
        throw new BadRequestException('KYC data required for this service');
      }
      const missingFields = cfg.requiredFields.filter(
        (f) => (payload.kyc as Record<string, unknown>)[f] == null,
      );
      if (missingFields.length) {
        throw new BadRequestException(
          `Missing required KYC fields: ${missingFields.join(', ')}`,
        );
      }
    }

    // 5. Pre-validate required documents BEFORE starting transaction (to avoid unnecessary writes)
    if (cfg.requiredDocs.length) {
      const existingDocs = await this.customerDocumentRepo.find({
        where: { customer_id: customerId },
      });
      const existingDocTypes = new Set(existingDocs.map((d) => d.doc_type));
      const incomingDocTypes = new Set(
        (payload?.documents || []).map((d) => d.doc_type),
      );
      const combined = new Set<CustomerDocumentType>([
        ...existingDocTypes,
        ...incomingDocTypes,
      ]);
      const stillMissing = cfg.requiredDocs.filter((rt) => !combined.has(rt));
      if (stillMissing.length) {
        throw new BadRequestException(
          `Missing required documents: ${stillMissing.join(', ')}`,
        );
      }
    }

    // 6. Transactional execution to ensure atomicity for all writes
    return this.dataSource.transaction(async (manager) => {
      // Re-check for race condition inside transaction (another tx may have created it)
      const existingInside = await manager
        .getRepository(CustomerService)
        .findOne({
          where: { customer_id: customerId, service_type: serviceType },
        });
      if (existingInside) {
        return { service: existingInside, status: 'already_active' };
      }

      // (a) KYC (create if required)
      let kycRecord = sufficient;
      if (!kycRecord) {
        kycRecord = manager.getRepository(CustomerKyc).create({
          customer_id: customerId,
          kyc_level: cfg.level,
          status: KycStatus.APPROVED, // TODO: future review flow (PENDING)
          ...payload?.kyc,
          submitted_at: new Date(),
          reviewed_at: new Date(),
        });
        kycRecord = await manager.getRepository(CustomerKyc).save(kycRecord);
      }

      // (b) Upsert primary address
      if (payload?.address) {
        const addressRepo = manager.getRepository(CustomerAddress);
        let primary = await addressRepo.findOne({
          where: { customer_id: customerId, is_primary: true },
        });
        if (!primary) {
          primary = addressRepo.create({
            customer_id: customerId,
            is_primary: true,
            ...payload.address,
          });
        } else {
          Object.assign(primary, payload.address);
        }
        await addressRepo.save(primary);
      }

      // (c) Documents (only those provided in this request)
      if (payload?.documents?.length) {
        const docRepo = manager.getRepository(CustomerDocument);
        const docs: CustomerDocument[] = payload.documents.map((d) =>
          docRepo.create({
            customer_id: customerId,
            kyc_id: kycRecord?.id,
            doc_type: d.doc_type,
            storage_ref: d.storage_ref,
            checksum: d.checksum || null,
            encrypted: false,
            metadata: null,
          }),
        );
        await docRepo.save(docs);
      }

      // (d) Service activation
      const service = manager.getRepository(CustomerService).create({
        customer_id: customerId,
        service_type: serviceType,
        active: true,
      });
      const savedService = await manager
        .getRepository(CustomerService)
        .save(service);

      return { service: savedService, kyc: kycRecord, status: 'activated' };
    });
  }
}
