import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    // Idempotent: if already active return existing
    const existing = await this.customerServiceRepo.findOne({
      where: { customer_id: customerId, service_type: serviceType },
    });
    if (existing) {
      return { service: existing, status: 'already_active' };
    }
    const cfg = this.requiredConfig[serviceType];
    if (!cfg) {
      throw new BadRequestException('Unsupported service');
    }
    // Find existing approved KYC with sufficient level
    const kycs = await this.customerKycRepo.find({
      where: { customer_id: customerId, status: KycStatus.APPROVED },
      order: { created_at: 'DESC' },
    });
    const sufficient = kycs.find(
      (k) => this.kycLevelOrder(k.kyc_level) >= this.kycLevelOrder(cfg.level),
    );

    let kycRecord = sufficient;
    if (!kycRecord) {
      // Need to create new KYC (auto-approve policy for now)
      if (!payload?.kyc) {
        throw new BadRequestException('KYC data required for this service');
      }
      // Validate required fields presence
      const missing = cfg.requiredFields.filter(
        (f) => (payload.kyc as Record<string, unknown>)[f] == null,
      );
      if (missing.length) {
        throw new BadRequestException(
          `Missing required KYC fields: ${missing.join(', ')}`,
        );
      }
      kycRecord = this.customerKycRepo.create({
        customer_id: customerId,
        kyc_level: cfg.level,
        status: KycStatus.APPROVED, // future: set PENDING and add review flow
        ...payload.kyc,
        submitted_at: new Date(),
        reviewed_at: new Date(),
      });
      kycRecord = await this.customerKycRepo.save(kycRecord);
    }

    // Upsert primary address if provided
    if (payload?.address) {
      let primary = await this.customerAddressRepo.findOne({
        where: { customer_id: customerId, is_primary: true },
      });
      if (!primary) {
        primary = this.customerAddressRepo.create({
          customer_id: customerId,
          is_primary: true,
          ...payload.address,
        });
      } else {
        Object.assign(primary, payload.address);
      }
      await this.customerAddressRepo.save(primary);
    }

    // Documents (metadata only here)
    if (payload?.documents?.length) {
      const docs: CustomerDocument[] = payload.documents.map((d) =>
        this.customerDocumentRepo.create({
          customer_id: customerId,
          kyc_id: kycRecord?.id,
          doc_type: d.doc_type,
          storage_ref: d.storage_ref,
          checksum: d.checksum || null,
          encrypted: false,
          metadata: null,
        }),
      );
      await this.customerDocumentRepo.save(docs);
    }

    // Validate document presence for required docs (simple presence check by doc_type)
    if (cfg.requiredDocs.length) {
      const allDocs = await this.customerDocumentRepo.find({
        where: { customer_id: customerId },
      });
      const haveTypes = new Set(allDocs.map((d) => d.doc_type));
      const missingDocs = cfg.requiredDocs.filter((rt) => !haveTypes.has(rt));
      if (missingDocs.length) {
        throw new BadRequestException(
          `Missing required documents: ${missingDocs.join(', ')}`,
        );
      }
    }

    const service = this.customerServiceRepo.create({
      customer_id: customerId,
      service_type: serviceType,
      active: true,
    });
    const savedService = await this.customerServiceRepo.save(service);
    return { service: savedService, kyc: kycRecord, status: 'activated' };
  }
}
