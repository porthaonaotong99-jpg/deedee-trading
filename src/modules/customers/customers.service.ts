import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan, LessThan, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
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
import { CustomerKycServiceUsage } from './entities/customer-kyc-service-usage.entity';
import { CustomerAddress } from './entities/customer-address.entity';
import {
  CustomerDocument,
  CustomerDocumentType,
} from './entities/customer-document.entity';
import {
  PasswordReset,
  PasswordResetType,
  PasswordResetStatus,
} from './entities/password-reset.entity';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
} from '../payments/entities/payment.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  PaginationUtil,
  PaginationOptions,
  PaginatedResult,
} from '../../common/utils/pagination.util';
import {
  ForgotPasswordDto,
  ResetPasswordWithOtpDto,
  ResetPasswordWithTokenDto,
  PasswordResetMethod,
} from './dto/password-reset.dto';
import type { EmailService } from './interfaces/email.interface';

import { SubscriptionDuration } from './entities/customer-service.entity';
import type { PaymentProvider } from './services/payment.service';
import { PaymentRecordService } from '../payments/services/payment-record.service';
import {
  PaymentAuditService,
  PaymentAuditContext,
} from '../payments/services/payment-audit.service';
import {
  PaymentAuditAction,
  PaymentAuditLevel,
} from '../payments/entities/payment-audit-log.entity';
import { SubscriptionPackagesService } from '../subscription-packages/subscription-packages.service';
import {
  ServiceFundTransaction,
  ServiceFundTransactionType,
} from './entities/service-fund-transaction.entity';
import { TopupServiceDto, TransferFundsDto } from './dto/funds.dto';

export interface PendingPremiumMembership {
  service_id: string;
  customer_id: string;
  customer_info: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  service_type: CustomerServiceType;
  subscription_duration: SubscriptionDuration | null;
  subscription_fee: number | null;
  applied_at: Date;
  payment_info: {
    payment_id: string;
    amount: number;
    paid_at: Date;
    status: PaymentStatus;
    payment_slip_url?: string;
  };
}

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
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepo: Repository<PasswordReset>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly subscriptionPackagesService: SubscriptionPackagesService,
    @InjectRepository(ServiceFundTransaction)
    private readonly serviceFundTxRepo: Repository<ServiceFundTransaction>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject('EmailService')
    private readonly emailService: EmailService,
    @Inject('PaymentService')
    private readonly paymentService: PaymentProvider,
    private readonly paymentRecordService: PaymentRecordService,
    private readonly paymentAuditService: PaymentAuditService,
  ) {}

  async create(dto: CreateCustomerDto) {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async findAll(query: PaginationQueryDto) {
    const { page, limit, skip } = PaginationUtil.calculatePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 10,
      maxLimit: 100,
    });

    const [data, total] = await this.repo.findAndCount({
      take: limit,
      skip,
      order: { created_at: 'DESC' },
    });

    return PaginationUtil.createPaginatedResult(data, total, {
      page,
      limit,
    });
  }

  async findOne(id: string) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Customer not found');
    return entity;
  }

  async findOneWithServices(id: string) {
    const entity = await this.repo.findOne({
      where: { id },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        username: true,
        email: true,
        phone_number: true,
        status: true,
        isVerify: true,
        profile: true,
        created_at: true,
        updated_at: true,
        // Explicitly exclude password field
      },
    });
    if (!entity) throw new NotFoundException('Customer not found');

    // Get active customer services (include subscription data to compute expiry for premium membership)
    const services = await this.customerServiceRepo.find({
      where: { customer_id: id, active: true },
      select: {
        service_type: true,
        subscription_expires_at: true,
        subscription_duration: true,
        subscription_fee: true,
        active: true,
      },
      order: { applied_at: 'DESC' },
    });

    const now = new Date();
    const serviceResponses = services.map((s) => {
      if (s.service_type === CustomerServiceType.PREMIUM_MEMBERSHIP) {
        const expired =
          !s.subscription_expires_at || s.subscription_expires_at < now;
        return {
          service_type: s.service_type,
          expired,
          subscription_expires_at: s.subscription_expires_at,
        };
      }
      return { service_type: s.service_type };
    });

    return {
      ...entity,
      services: serviceResponses,
    };
  }

  async getPaymentHistory(
    customerId: string,
    options?: {
      status?: PaymentStatus;
      payment_type?: PaymentType;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    return this.paymentRecordService.getPaymentHistory(customerId, options);
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

  private calculateSubscriptionFee(
    serviceType: CustomerServiceType,
    duration: SubscriptionDuration,
  ): number {
    // Define pricing for different services and durations
    const pricing: Record<
      CustomerServiceType,
      Record<SubscriptionDuration, number>
    > = {
      [CustomerServiceType.PREMIUM_MEMBERSHIP]: {
        [SubscriptionDuration.THREE_MONTHS]: 299.99,
        [SubscriptionDuration.SIX_MONTHS]: 549.99,
        [SubscriptionDuration.TWELVE_MONTHS]: 999.99,
      },
      [CustomerServiceType.PREMIUM_STOCK_PICKS]: {
        [SubscriptionDuration.THREE_MONTHS]: 0,
        [SubscriptionDuration.SIX_MONTHS]: 0,
        [SubscriptionDuration.TWELVE_MONTHS]: 0,
      },
      [CustomerServiceType.INTERNATIONAL_STOCK_ACCOUNT]: {
        [SubscriptionDuration.THREE_MONTHS]: 0,
        [SubscriptionDuration.SIX_MONTHS]: 0,
        [SubscriptionDuration.TWELVE_MONTHS]: 0,
      },
      [CustomerServiceType.GUARANTEED_RETURNS]: {
        [SubscriptionDuration.THREE_MONTHS]: 0,
        [SubscriptionDuration.SIX_MONTHS]: 0,
        [SubscriptionDuration.TWELVE_MONTHS]: 0,
      },
    };

    return pricing[serviceType][duration] || 0;
  }

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
      requiresPayment?: boolean;
      requiresAdminApproval?: boolean;
      subscriptionBased?: boolean;
      autoApprove?: boolean; // Auto-approve without KYC requirements
    }
  > = {
    [CustomerServiceType.PREMIUM_MEMBERSHIP]: {
      level: KycLevel.BASIC,
      requiredFields: [],
      requiredDocs: [],
      requiresPayment: true,
      requiresAdminApproval: true,
      subscriptionBased: true,
    },
    [CustomerServiceType.PREMIUM_STOCK_PICKS]: {
      level: KycLevel.BASIC,
      requiredFields: [],
      requiredDocs: [],
      requiresPayment: false,
      requiresAdminApproval: false,
      subscriptionBased: false,
      autoApprove: true, // Auto-approve without KYC for new customers
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
      requiresAdminApproval: true, // Requires admin approval after KYC submission
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
      requiresAdminApproval: true, // Requires admin approval after KYC submission
    },
  };

  async listServices(customerId: string) {
    return this.customerServiceRepo.find({
      where: { customer_id: customerId },
    });
  }

  async topupInternationalAccount(
    customerId: string,
    serviceId: string,
    dto: TopupServiceDto,
  ) {
    if (dto.amount <= 0) throw new BadRequestException('Amount must be > 0');
    return this.dataSource.transaction(async (manager) => {
      const service = await manager.findOne(this.customerServiceRepo.target, {
        where: { id: serviceId, customer_id: customerId },
      });
      if (!service) throw new NotFoundException('Service not found');
      const isIntl =
        service.service_type ===
        CustomerServiceType.INTERNATIONAL_STOCK_ACCOUNT;
      if (!isIntl) {
        throw new BadRequestException(
          'Service is not an international stock account',
        );
      }
      if (!service.active)
        throw new BadRequestException('Service is not active');
      service.balance = Number(service.balance) + dto.amount;
      await manager.save(service);
      const tx = this.serviceFundTxRepo.create({
        customer_id: customerId,
        to_service_id: service.id,
        tx_type: ServiceFundTransactionType.TOPUP,
        amount: dto.amount,
        reference: dto.reference || null,
        description: 'International account top-up',
      });
      await manager.save(tx);
      return {
        service_id: service.id,
        balance: service.balance,
        transaction_id: tx.id,
      };
    });
  }

  async transferToGuaranteedReturns(customerId: string, dto: TransferFundsDto) {
    if (dto.amount <= 0) throw new BadRequestException('Amount must be > 0');
    if (dto.from_service_id === dto.to_service_id) {
      throw new BadRequestException(
        'from_service_id and to_service_id must differ',
      );
    }
    return this.dataSource.transaction(async (manager) => {
      const from = await manager.findOne(this.customerServiceRepo.target, {
        where: { id: dto.from_service_id, customer_id: customerId },
      });
      const to = await manager.findOne(this.customerServiceRepo.target, {
        where: { id: dto.to_service_id, customer_id: customerId },
      });
      if (!from || !to)
        throw new NotFoundException('Source or destination service not found');
      if (
        from.service_type !== CustomerServiceType.INTERNATIONAL_STOCK_ACCOUNT
      ) {
        throw new BadRequestException(
          'Source must be INTERNATIONAL_STOCK_ACCOUNT',
        );
      }
      if (to.service_type !== CustomerServiceType.GUARANTEED_RETURNS) {
        throw new BadRequestException('Destination must be GUARANTEED_RETURNS');
      }
      if (!from.active || !to.active)
        throw new BadRequestException('Both services must be active');
      if (Number(from.balance) < dto.amount) {
        throw new BadRequestException(
          'Insufficient balance in international account',
        );
      }
      from.balance = Number(from.balance) - dto.amount;
      to.invested_amount = Number(to.invested_amount) + dto.amount;
      await manager.save(from);
      await manager.save(to);
      const tx = this.serviceFundTxRepo.create({
        customer_id: customerId,
        from_service_id: from.id,
        to_service_id: to.id,
        tx_type: ServiceFundTransactionType.TRANSFER,
        amount: dto.amount,
        reference: dto.reference || null,
        description: 'Transfer international -> guaranteed returns',
      });
      await manager.save(tx);
      return {
        from_service_id: from.id,
        to_service_id: to.id,
        new_source_balance: from.balance,
        new_destination_invested_amount: to.invested_amount,
        transaction_id: tx.id,
      };
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
      subscription?: {
        duration: SubscriptionDuration;
        fee?: number;
      };
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

    // 3. KYC Handling Strategy
    // If payload.kyc provided -> create NEW KYC (APPROVED if autoApprove else PENDING)
    // If NOT provided AND service requires KYC (required fields/docs + admin approval without payment)
    //    -> duplicate latest APPROVED KYC (meeting or exceeding required level) into a NEW PENDING KYC
    //       and (if no new documents supplied) clone required (or all) documents.
    // If NOT provided AND no KYC needed -> skip creating KYC.

    const serviceNeedsKyc =
      (cfg.requiredFields.length > 0 || cfg.requiredDocs.length > 0) &&
      cfg.requiresAdminApproval &&
      !cfg.requiresPayment;

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

      // (a) KYC creation / duplication (optional)
      let kycRecord: CustomerKyc | null = null;
      let duplicatedFromKycId: string | null = null;
      const kycRepoTx = manager.getRepository(CustomerKyc);
      const docRepoTx = manager.getRepository(CustomerDocument);

      if (payload?.kyc) {
        // Fresh KYC data provided
        if (cfg.autoApprove) {
          kycRecord = kycRepoTx.create({
            customer_id: customerId,
            kyc_level: cfg.level,
            status: KycStatus.APPROVED,
            submitted_at: new Date(),
            reviewed_at: new Date(),
            reviewed_by: null,
            ...payload.kyc,
          });
        } else {
          kycRecord = kycRepoTx.create({
            customer_id: customerId,
            kyc_level: cfg.level,
            status: KycStatus.PENDING,
            submitted_at: new Date(),
            ...payload.kyc,
          });
        }
        kycRecord = await kycRepoTx.save(kycRecord);
      } else if (serviceNeedsKyc) {
        // No KYC input but service requires KYC: attempt duplication of prior approved KYC
        const approvedKycs = await kycRepoTx.find({
          where: { customer_id: customerId, status: KycStatus.APPROVED },
          order: { created_at: 'DESC' },
          take: 5,
        });
        const source =
          approvedKycs.find(
            (k) =>
              this.kycLevelOrder(k.kyc_level) >= this.kycLevelOrder(cfg.level),
          ) || approvedKycs[0];

        if (!source) {
          throw new BadRequestException(
            'KYC information required but no existing approved KYC found. Please submit KYC data.',
          );
        }

        duplicatedFromKycId = source.id;

        const cloneFields: Partial<CustomerKyc> = {
          dob: source.dob,
          nationality: source.nationality,
          // employment related / financial profile
          employment_status: source.employment_status,
          annual_income: source.annual_income,
          investment_experience: source.investment_experience,
          source_of_funds: source.source_of_funds,
          risk_tolerance: source.risk_tolerance,
        };

        kycRecord = kycRepoTx.create({
          customer_id: customerId,
          kyc_level: cfg.level,
          status: KycStatus.PENDING,
          submitted_at: new Date(),
          ...cloneFields,
        });
        kycRecord = await kycRepoTx.save(kycRecord);

        // Duplicate documents only if user didn't supply new ones
        if (!payload?.documents || payload.documents.length === 0) {
          const srcDocs = await docRepoTx.find({
            where: { kyc_id: source.id, customer_id: customerId },
          });
          const docsToClone = cfg.requiredDocs.length
            ? srcDocs.filter((d) => cfg.requiredDocs.includes(d.doc_type))
            : srcDocs;
          if (docsToClone.length) {
            const clones = docsToClone.map((d) =>
              docRepoTx.create({
                customer_id: customerId,
                kyc_id: kycRecord!.id,
                doc_type: d.doc_type,
                storage_ref: d.storage_ref,
                checksum: d.checksum,
                encrypted: d.encrypted,
                metadata: d.metadata,
              }),
            );
            await docRepoTx.save(clones);
          }
        }
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

      // (c) Documents (optional; only if provided)
      if (payload?.documents?.length) {
        const docs: CustomerDocument[] = payload.documents.map((d) =>
          docRepoTx.create({
            customer_id: customerId,
            kyc_id: kycRecord?.id || null,
            doc_type: d.doc_type,
            storage_ref: d.storage_ref,
            checksum: d.checksum || null,
            encrypted: false,
            metadata: null,
          }),
        );
        await docRepoTx.save(docs);
      }

      // (d) Service activation
      const config = this.requiredConfig[serviceType];
      const hasPendingKyc = kycRecord?.status === KycStatus.PENDING;

      // Determine if service should be active immediately (must meet all: autoApprove OR no admin approval, no payment, no pending KYC)
      const shouldActivateImmediately =
        !config.requiresPayment &&
        !config.requiresAdminApproval &&
        !hasPendingKyc;

      // Calculate subscription details for subscription-based services
      let subscriptionExpiresAt: Date | null = null;
      let subscriptionFee: number | null = null;

      if (config.subscriptionBased && payload?.subscription) {
        const { duration, fee } = payload.subscription;

        // Calculate expiration date
        subscriptionExpiresAt = new Date();
        subscriptionExpiresAt.setMonth(
          subscriptionExpiresAt.getMonth() + duration,
        );

        // Set subscription fee (use provided fee or calculate default pricing)
        subscriptionFee =
          fee || this.calculateSubscriptionFee(serviceType, duration);
      }

      const service = manager.getRepository(CustomerService).create({
        customer_id: customerId,
        service_type: serviceType,
        active: shouldActivateImmediately,
        requires_payment: config.requiresPayment || false,
        subscription_duration: payload?.subscription?.duration || null,
        subscription_expires_at: subscriptionExpiresAt,
        subscription_fee: subscriptionFee,
        kyc_id: kycRecord?.id,
      });
      const savedService = await manager
        .getRepository(CustomerService)
        .save(service);

      // Determine final status
      let finalStatus = 'activated';
      if (config.requiresPayment) {
        finalStatus = 'pending_payment';
      } else if (config.requiresAdminApproval) {
        finalStatus = 'pending_admin_approval';
      } else if (hasPendingKyc) {
        finalStatus = 'pending_review';
      }

      return {
        service: savedService,
        kyc: kycRecord,
        status: finalStatus,
        duplicated_from_kyc_id: duplicatedFromKycId || undefined,
      };
    });
  }

  async approveService(
    serviceId: string,
    reviewerUserId: string,
    context?: PaymentAuditContext,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const svcRepo = manager.getRepository(CustomerService);
      const kycRepo = manager.getRepository(CustomerKyc);
      const usageRepo = manager.getRepository(CustomerKycServiceUsage);

      const service = await svcRepo.findOne({
        where: { id: serviceId },
      });
      if (!service) {
        throw new NotFoundException('Service application not found');
      }
      if (service.active) {
        return { service, status: 'already_active' };
      }

      const config = this.requiredConfig[service.service_type];

      // Handle services that require payment + admin approval (like premium membership)
      if (config.requiresPayment && config.requiresAdminApproval) {
        // Check if payment has been completed
        const payments = await this.paymentRecordService.getPaymentsByService(
          service.id,
        );
        const successfulPayment = payments.find(
          (p) => p.status === PaymentStatus.SUCCEEDED,
        );

        if (!successfulPayment) {
          throw new BadRequestException(
            'Payment must be completed before service can be approved',
          );
        }

        // If there is an approved KYC already meeting requirements, link it (optional for payment+admin cases)
        let linkedKyc: CustomerKyc | undefined;
        const approvedKycs = await kycRepo.find({
          where: {
            customer_id: service.customer_id,
            status: KycStatus.APPROVED,
          },
          order: { created_at: 'DESC' },
        });
        if (approvedKycs.length) {
          linkedKyc = approvedKycs[0];
          service.kyc_id = linkedKyc.id;
        }

        // Activate the service
        service.active = true;
        const savedService = await svcRepo.save(service);

        // Record usage if kyc linked
        if (linkedKyc) {
          await usageRepo.insert({
            kyc_id: linkedKyc.id,
            service_id: savedService.id,
            purpose: 'activation',
            kyc_snapshot: {
              kyc_level: linkedKyc.kyc_level,
              reviewed_at: linkedKyc.reviewed_at
                ? linkedKyc.reviewed_at.toISOString()
                : undefined,
              status: linkedKyc.status,
            },
          });
        }

        // Log admin approval
        await this.paymentAuditService.logAdminApproved(
          successfulPayment.id,
          service.customer_id,
          service.service_type,
          reviewerUserId,
          context,
        );

        // Log subscription activation
        await this.paymentAuditService.logSubscriptionActivated(
          successfulPayment.id,
          service.customer_id,
          service.service_type,
          service.subscription_expires_at || undefined,
          context,
        );

        return {
          service: savedService,
          status: 'activated',
          payment: successfulPayment,
        };
      }

      // Handle services that require KYC approval (original logic)
      const kycs = await kycRepo.find({
        where: { customer_id: service.customer_id, status: KycStatus.PENDING },
        order: { created_at: 'DESC' },
      });
      const pendingKyc = kycs[0];
      if (!pendingKyc) {
        throw new BadRequestException(
          'No pending KYC to approve for this service',
        );
      }

      pendingKyc.status = KycStatus.APPROVED;
      pendingKyc.reviewed_at = new Date();
      pendingKyc.reviewed_by = reviewerUserId;
      await kycRepo.save(pendingKyc);

      service.active = true;
      service.kyc_id = pendingKyc.id;
      const savedService = await svcRepo.save(service);

      await usageRepo.insert({
        kyc_id: pendingKyc.id,
        service_id: savedService.id,
        purpose: 'activation',
        kyc_snapshot: {
          kyc_level: pendingKyc.kyc_level,
          reviewed_at: pendingKyc.reviewed_at
            ? pendingKyc.reviewed_at.toISOString()
            : undefined,
          status: pendingKyc.status,
        },
      });

      return { service: savedService, kyc: pendingKyc, status: 'activated' };
    });
  }

  async rejectService(
    serviceId: string,
    reviewerUserId: string,
    rejectionReason?: string,
  ) {
    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const svcRepo =
          transactionalEntityManager.getRepository(CustomerService);
        const kycRepo = transactionalEntityManager.getRepository(CustomerKyc);

        const service = await svcRepo.findOne({
          where: { id: serviceId },
          relations: ['customer'],
        });

        if (!service) {
          throw new NotFoundException('Service not found');
        }

        if (service.active) {
          throw new BadRequestException('Service is already active');
        }

        // Handle payment-based services (premium_stock_picks)
        if (service.service_type === CustomerServiceType.PREMIUM_STOCK_PICKS) {
          const paymentRecords =
            await this.paymentRecordService.getPaymentsByService(
              serviceId,
              PaymentStatus.SUCCEEDED,
            );
          const successfulPayment = paymentRecords[0];

          if (successfulPayment) {
            // Mark service as rejected (just set active to false)
            service.active = false;
            const savedService = await svcRepo.save(service);

            // Log rejection in payment audit
            await this.paymentAuditService.logPaymentAction(
              successfulPayment.id,
              service.customer_id,
              PaymentAuditAction.ADMIN_REJECTED,
              `Admin rejected premium service. Reason: ${rejectionReason || 'No reason provided'}`,
              {
                level: PaymentAuditLevel.INFO,
                metadata: {
                  serviceId: service.id,
                  serviceType: service.service_type,
                  rejectionReason: rejectionReason || 'No reason provided',
                  reviewerUserId,
                },
              },
            );

            return {
              service: savedService,
              status: 'rejected',
              payment: successfulPayment,
              reason: rejectionReason,
            };
          }
        }

        // Handle services that require KYC approval (original logic)
        const kycs = await kycRepo.find({
          where: {
            customer_id: service.customer_id,
            status: KycStatus.PENDING,
          },
          order: { created_at: 'DESC' },
        });
        const pendingKyc = kycs[0];
        if (!pendingKyc) {
          throw new BadRequestException(
            'No pending KYC to reject for this service',
          );
        }

        pendingKyc.status = KycStatus.REJECTED;
        pendingKyc.reviewed_at = new Date();
        pendingKyc.reviewed_by = reviewerUserId;
        pendingKyc.rejection_reason = rejectionReason || null;
        await kycRepo.save(pendingKyc);

        service.active = false;
        const savedService = await svcRepo.save(service);

        return {
          service: savedService,
          kyc: pendingKyc,
          status: 'rejected',
          reason: rejectionReason,
        };
      },
    );
  }

  async listKyc(options: {
    page?: number;
    limit?: number;
    status?: KycStatus;
    level?: KycLevel;
    customer_id?: string;
  }) {
    // TypeORM-based optimized approach (no manual raw SQL)
    const { page, limit, skip } = PaginationUtil.calculatePagination({
      page: options.page,
      limit: options.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });

    // 1. Fetch KYC page with filters
    const qb = this.customerKycRepo.createQueryBuilder('k');
    if (options.status) {
      qb.andWhere('k.status = :status', { status: options.status });
    }
    if (options.level) {
      qb.andWhere('k.kyc_level = :level', { level: options.level });
    }
    if (options.customer_id) {
      qb.andWhere('k.customer_id = :cid', { cid: options.customer_id });
    }

    const [kycRecords, total] = await qb
      .orderBy('k.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    if (!kycRecords.length) {
      return PaginationUtil.createPaginatedResult([], total, { page, limit });
    }

    const kycIds = kycRecords.map((k) => k.id);

    // 2. Fetch direct services referencing these KYCs (single query)
    const directServices = await this.customerServiceRepo.find({
      where: kycIds.map((id) => ({ kyc_id: id })),
      order: { applied_at: 'DESC' },
    });

    // 3. Fetch usage rows (if table exists) + associated services (2 queries total, try/catch to skip if not migrated yet)
    let usageServices: CustomerService[] = [];
    try {
      const usageRows = await this.dataSource
        .getRepository(CustomerKycServiceUsage)
        .find({ where: kycIds.map((id) => ({ kyc_id: id })) });
      const usageServiceIds = Array.from(
        new Set(usageRows.map((u) => u.service_id)),
      );
      if (usageServiceIds.length) {
        usageServices = await this.customerServiceRepo.find({
          where: usageServiceIds.map((sid) => ({ id: sid })),
        });
      }
    } catch {
      // ignore (usage table may not exist yet)
    }

    // 4. Combine services deduplicated per KYC
    const allServicesById = new Map<string, CustomerService>();
    [...directServices, ...usageServices].forEach((svc) => {
      if (!allServicesById.has(svc.id)) allServicesById.set(svc.id, svc);
    });

    const servicesByKyc: Record<string, CustomerService[]> = {};
    directServices.forEach((svc) => {
      if (!svc.kyc_id) return;
      (servicesByKyc[svc.kyc_id] = servicesByKyc[svc.kyc_id] || []).push(svc);
    });
    usageServices.forEach((svc) => {
      if (!svc.kyc_id) return; // usage-based link may not set kyc_id on svc (if old record); skip if missing
      const arr = (servicesByKyc[svc.kyc_id] = servicesByKyc[svc.kyc_id] || []);
      if (!arr.some((s) => s.id === svc.id)) arr.push(svc);
    });

    // 5. Shape response
    // 5. Fetch related customer basic profile data
    const customerIds = Array.from(
      new Set(kycRecords.map((k) => k.customer_id)),
    );
    let customersById: Record<string, Partial<Customer>> = {};
    if (customerIds.length) {
      const customerEntities = await this.repo.find({
        where: customerIds.map((id) => ({ id })),
        select: [
          'id',
          'username',
          'email',
          'first_name',
          'last_name',
          'status',
          'created_at',
        ],
      });
      customersById = customerEntities.reduce<
        Record<string, Partial<Customer>>
      >((acc, c) => {
        acc[c.id] = c;
        return acc;
      }, {});
    }

    const enriched = kycRecords.map((k) => ({
      ...k,
      customer: customersById[k.customer_id] || null,
      services: (servicesByKyc[k.id] || []).map((s) => ({
        id: s.id,
        service_type: s.service_type,
        active: s.active,
        subscription_duration: s.subscription_duration,
        subscription_expires_at: s.subscription_expires_at,
        applied_at: s.applied_at,
      })),
    }));

    return PaginationUtil.createPaginatedResult(enriched, total, {
      page,
      limit,
    });
  }

  // --- Password Reset Methods ---

  async forgotPassword(
    dto: ForgotPasswordDto,
    context?: { userAgent?: string; ipAddress?: string },
  ): Promise<{
    status: string;
    message: string;
    expires_at: string;
    method: PasswordResetMethod;
  }> {
    // Rate limiting: Allow max 3 requests per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await this.passwordResetRepo.count({
      where: {
        email: dto.email,
        created_at: MoreThan(oneHourAgo),
      },
    });

    if (recentRequests >= 3) {
      throw new BadRequestException(
        'Too many password reset requests. Please try again later.',
      );
    }

    // Find customer by email
    const customer = await this.repo.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'first_name', 'last_name', 'username'],
    });

    // Always return success to prevent email enumeration attacks
    if (!customer) {
      return {
        status: 'success',
        message:
          'If the email exists, password reset instructions have been sent.',
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        method: dto.method || PasswordResetMethod.EMAIL_OTP,
      };
    }

    // Invalidate existing active tokens for this email
    await this.passwordResetRepo.update(
      {
        email: dto.email,
        status: PasswordResetStatus.PENDING,
      },
      {
        status: PasswordResetStatus.REVOKED,
      },
    );

    const method = dto.method || PasswordResetMethod.EMAIL_OTP;
    let token: string;
    let expiresAt: Date;

    if (method === PasswordResetMethod.EMAIL_OTP) {
      // Generate 6-digit OTP
      token = crypto.randomInt(100000, 999999).toString();
      expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    } else {
      // Generate secure token for email link
      token = crypto.randomBytes(32).toString('hex');
      expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    }

    // Hash the token before storing
    const tokenHash = await argon2.hash(token);

    // Create password reset record
    const passwordReset = this.passwordResetRepo.create({
      customer_id: customer.id,
      email: customer.email,
      reset_type:
        method === PasswordResetMethod.EMAIL_OTP
          ? PasswordResetType.EMAIL_OTP
          : PasswordResetType.EMAIL_LINK,
      status: PasswordResetStatus.PENDING,
      token_hash: tokenHash,
      expires_at: expiresAt,
      user_agent: context?.userAgent || null,
      ip_address: context?.ipAddress || null,
    });

    await this.passwordResetRepo.save(passwordReset);

    // Send email
    const customerName = customer.first_name || customer.username;

    if (method === PasswordResetMethod.EMAIL_OTP) {
      await this.emailService.sendOtpEmail({
        email: customer.email,
        otp: token,
        expiresAt,
        customerName,
      });
    } else {
      // Create JWT token for the reset link
      const resetToken = this.jwtService.sign(
        {
          sub: customer.id,
          email: customer.email,
          type: 'password_reset',
          reset_id: passwordReset.id,
        },
        {
          secret: this.configService.get<string>(
            'JWT_SECRET',
            'your-secret-key',
          ),
          expiresIn: '1h',
        },
      );

      const resetLink = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;

      await this.emailService.sendResetLinkEmail({
        email: customer.email,
        resetLink,
        expiresAt,
        customerName,
      });
    }

    return {
      status: 'success',
      message: 'Password reset instructions sent to your email.',
      expires_at: expiresAt.toISOString(),
      method,
    };
  }

  async resetPasswordWithOtp(
    dto: ResetPasswordWithOtpDto,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context?: { userAgent?: string; ipAddress?: string },
  ): Promise<{ status: string; message: string; reset_at: string }> {
    // Find active OTP reset record
    const resetRecord = await this.passwordResetRepo.findOne({
      where: {
        email: dto.email,
        reset_type: PasswordResetType.EMAIL_OTP,
        status: PasswordResetStatus.PENDING,
        expires_at: MoreThan(new Date()),
      },
      order: { created_at: 'DESC' },
      relations: ['customer'],
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired OTP.');
    }

    // Check attempt limit
    if (resetRecord.attempt_count >= resetRecord.max_attempts) {
      resetRecord.status = PasswordResetStatus.REVOKED;
      await this.passwordResetRepo.save(resetRecord);
      throw new BadRequestException(
        'Too many failed attempts. Please request a new OTP.',
      );
    }

    // Verify OTP
    const isValidOtp = await argon2.verify(resetRecord.token_hash, dto.otp);

    if (!isValidOtp) {
      resetRecord.attempt_count += 1;
      await this.passwordResetRepo.save(resetRecord);
      throw new BadRequestException('Invalid OTP.');
    }

    // Update password
    const hashedPassword = await argon2.hash(dto.new_password);
    await this.repo.update(resetRecord.customer_id, {
      password: hashedPassword,
    });

    // Mark reset as used
    resetRecord.status = PasswordResetStatus.USED;
    resetRecord.used_at = new Date();
    await this.passwordResetRepo.save(resetRecord);

    // Invalidate all other pending resets for this customer
    await this.passwordResetRepo.update(
      {
        email: dto.email,
        status: PasswordResetStatus.PENDING,
      },
      {
        status: PasswordResetStatus.REVOKED,
      },
    );

    const resetAt = new Date().toISOString();

    return {
      status: 'success',
      message: 'Password reset successfully.',
      reset_at: resetAt,
    };
  }

  async resetPasswordWithToken(
    dto: ResetPasswordWithTokenDto,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context?: { userAgent?: string; ipAddress?: string },
  ): Promise<{ status: string; message: string; reset_at: string }> {
    try {
      // Define interface for JWT payload
      interface ResetTokenPayload {
        sub: string;
        email: string;
        type: string;
        reset_id: string;
      }

      // Verify JWT token
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const payload = this.jwtService.verify(dto.reset_token, {
        secret: this.configService.get<string>('JWT_SECRET', 'your-secret-key'),
      }) as ResetTokenPayload;

      if (payload.type !== 'password_reset') {
        throw new UnauthorizedException('Invalid token type.');
      }

      // Find the reset record
      const resetRecord = await this.passwordResetRepo.findOne({
        where: {
          id: payload.reset_id,
          customer_id: payload.sub,
          email: payload.email,
          reset_type: PasswordResetType.EMAIL_LINK,
          status: PasswordResetStatus.PENDING,
          expires_at: MoreThan(new Date()),
        },
        relations: ['customer'],
      });

      if (!resetRecord) {
        throw new BadRequestException('Invalid or expired reset token.');
      }

      // Update password
      const hashedPassword = await argon2.hash(dto.new_password);
      await this.repo.update(resetRecord.customer_id, {
        password: hashedPassword,
      });

      // Mark reset as used
      resetRecord.status = PasswordResetStatus.USED;
      resetRecord.used_at = new Date();
      await this.passwordResetRepo.save(resetRecord);

      // Invalidate all other pending resets for this customer
      await this.passwordResetRepo.update(
        {
          email: payload.email,
          status: PasswordResetStatus.PENDING,
        },
        {
          status: PasswordResetStatus.REVOKED,
        },
      );

      const resetAt = new Date().toISOString();

      return {
        status: 'success',
        message: 'Password reset successfully.',
        reset_at: resetAt,
      };
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.name === 'JsonWebTokenError' ||
          error.name === 'TokenExpiredError')
      ) {
        throw new BadRequestException('Invalid or expired reset token.');
      }
      throw error;
    }
  }

  // --- Premium Membership with Payment ---

  async applyPremiumMembershipWithPayment(
    customerId: string,
    subscriptionParams: {
      duration: SubscriptionDuration;
      fee?: number;
    },
  ) {
    // Prevent duplicate application if there is:
    // 1. An active premium membership (active = true and not expired)
    // 2. A pending premium membership application awaiting payment approval (active = false but payment in pending/slip submitted/processing)
    // 3. A non-expired (future subscription_expires_at) membership even if active flag still true
    const now = new Date();
    const candidateServices = await this.customerServiceRepo.find({
      where: {
        customer_id: customerId,
        service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
      },
    });

    if (candidateServices.length) {
      // Load payments for these services to assess pending state
      const serviceIds = candidateServices.map((s) => s.id);
      const pendingRelatedPayments = await this.paymentRepo.find({
        where: serviceIds.map((id) => ({
          service_id: id,
        })),
      });

      const blockingService = candidateServices.find((svc) => {
        const notExpired =
          svc.subscription_expires_at && svc.subscription_expires_at > now;
        const hasActive =
          svc.active && (notExpired || !svc.subscription_expires_at);
        const relatedPayments = pendingRelatedPayments.filter(
          (p) => p.service_id === svc.id,
        );
        const hasPendingPayment = relatedPayments.some((p) =>
          [
            PaymentStatus.PENDING,
            PaymentStatus.PAYMENT_SLIP_SUBMITTED,
            PaymentStatus.PROCESSING,
          ].includes(p.status),
        );
        return hasActive || hasPendingPayment;
      });

      if (blockingService) {
        throw new BadRequestException(
          'Premium membership application already exists and is active or pending approval. You cannot apply again until it is approved, rejected, or expired.',
        );
      }
    }

    // Calculate subscription fee
    const fee =
      subscriptionParams.fee ||
      this.calculateSubscriptionFee(
        CustomerServiceType.PREMIUM_MEMBERSHIP,
        subscriptionParams.duration,
      );

    // Create payment intent
    const paymentIntent = await this.paymentService.createPaymentIntent({
      amount: fee * 100, // Convert to cents
      currency: 'USD',
      description: `Premium Membership - ${subscriptionParams.duration} months`,
      metadata: {
        customer_id: customerId,
        service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
        subscription_duration: subscriptionParams.duration,
      },
      returnUrl: `${this.configService.get('FRONTEND_URL')}/payment/success`,
      cancelUrl: `${this.configService.get('FRONTEND_URL')}/payment/cancel`,
    });

    // Apply the service with pending payment status
    const serviceResult = await this.applyService(
      customerId,
      CustomerServiceType.PREMIUM_MEMBERSHIP,
      {
        subscription: {
          duration: subscriptionParams.duration,
          fee,
        },
      },
    );

    // Type-safe service extraction
    const service = serviceResult.service;

    // Create payment record with audit context
    const paymentContext: PaymentAuditContext = {
      ip_address: undefined, // Will be provided by controller
      user_agent: undefined, // Will be provided by controller
    };

    const paymentRecord = await this.paymentRecordService.createPayment(
      {
        customer_id: customerId,
        service_id: service.id,
        payment_type: PaymentType.SUBSCRIPTION,
        payment_method: PaymentMethod.STRIPE, // Default method
        amount: fee,
        currency: 'USD',
        description: `Premium Membership - ${subscriptionParams.duration} months`,
        context: paymentContext,
      },
      paymentIntent,
    );

    // Log that subscription is pending admin approval after payment
    await this.paymentAuditService.logAdminApprovalPending(
      paymentRecord.id,
      customerId,
      CustomerServiceType.PREMIUM_MEMBERSHIP,
      paymentContext,
    );

    return {
      status: serviceResult.status,
      service: service,
      payment: {
        payment_id: paymentIntent.id,
        payment_url: paymentIntent.payment_url,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency,
        expires_at: paymentIntent.expires_at,
      },
    };
  }

  async confirmPayment(paymentIntentId: string, context?: PaymentAuditContext) {
    // Update payment record status
    const paymentRecord = await this.paymentRecordService.updatePaymentStatus(
      paymentIntentId,
      PaymentStatus.SUCCEEDED,
      { context },
    );

    // Confirm payment with payment provider
    const paymentIntent =
      await this.paymentService.confirmPayment(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment confirmation failed');
    }

    // Find the service using the payment record
    if (!paymentRecord.service_id) {
      throw new BadRequestException('Payment record has no associated service');
    }

    const service = await this.customerServiceRepo.findOne({
      where: { id: paymentRecord.service_id },
    });

    if (!service) {
      throw new NotFoundException('Service application not found');
    }

    // Check if this service requires admin approval after payment
    const config = this.requiredConfig[service.service_type];

    if (config.requiresAdminApproval && config.requiresPayment) {
      // For premium membership and similar services that require both payment AND admin approval
      // Do NOT activate automatically - keep waiting for admin approval

      await this.paymentAuditService.logAdminApprovalPending(
        paymentRecord.id,
        paymentRecord.customer_id,
        service.service_type,
        context,
      );

      return {
        status: 'payment_confirmed_pending_admin_approval',
        service: service,
        payment_id: paymentIntentId,
        payment_record: paymentRecord,
        message:
          'Payment confirmed successfully. Service activation pending admin approval.',
      };
    } else {
      // For services that only require payment (no admin approval), activate immediately
      await this.customerServiceRepo.update(service.id, {
        active: true,
      });

      // Log subscription activation
      await this.paymentAuditService.logSubscriptionActivated(
        paymentRecord.id,
        paymentRecord.customer_id,
        service.service_type,
        service.subscription_expires_at || undefined,
        context,
      );

      return {
        status: 'activated',
        service: {
          ...service,
          active: true,
        },
        payment_id: paymentIntentId,
        payment_record: paymentRecord,
      };
    }
  }

  // --- Premium Membership Manual Payment ---

  async applyPremiumMembershipManual(
    customerId: string,
    subscriptionParams: {
      duration: SubscriptionDuration;
      fee?: number;
    },
  ) {
    // Check if customer already has active premium membership
    const existingService = await this.customerServiceRepo.findOne({
      where: {
        customer_id: customerId,
        service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
        active: true,
      },
    });

    if (existingService) {
      throw new BadRequestException(
        'Customer already has an active premium membership',
      );
    }

    // Calculate subscription fee
    const fee =
      subscriptionParams.fee ||
      this.calculateSubscriptionFee(
        CustomerServiceType.PREMIUM_MEMBERSHIP,
        subscriptionParams.duration,
      );

    // Apply the service with pending payment status
    const serviceResult = await this.applyService(
      customerId,
      CustomerServiceType.PREMIUM_MEMBERSHIP,
      {
        subscription: {
          duration: subscriptionParams.duration,
          fee,
        },
      },
    );

    // Create manual payment record
    const paymentRecord = await this.paymentRecordService.createPayment(
      {
        customer_id: customerId,
        service_id: serviceResult.service.id,
        payment_type: PaymentType.SUBSCRIPTION,
        payment_method: PaymentMethod.MANUAL_TRANSFER,
        amount: fee,
        currency: 'USD',
        description: `Premium Membership - ${subscriptionParams.duration} months (Manual Payment)`,
      },
      {
        id: `manual-${Date.now()}-${customerId}`,
        payment_url: `manual-payment-${customerId}`,
        amount: fee * 100, // In cents
        currency: 'USD',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'pending',
      },
    );

    return {
      status: 'pending_payment_slip',
      service: serviceResult.service,
      payment: {
        payment_id: paymentRecord.id,
        amount: fee,
        currency: 'USD',
        instructions:
          'Please upload your payment slip after making the transfer',
      },
    };
  }

  async applyPremiumMembershipWithPaymentSlip(
    customerId: string,
    packageId: string,
    paymentSlipData: {
      payment_slip_url: string;
      payment_slip_filename: string;
      payment_amount: number;
      payment_reference?: string;
    },
  ) {
    // Check if customer already has active premium membership
    const existingService = await this.customerServiceRepo.findOne({
      where: {
        customer_id: customerId,
        service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
        active: true,
      },
    });

    if (existingService) {
      throw new BadRequestException(
        'Customer already has an active premium membership',
      );
    }

    // Load subscription package
    const pkg = await this.subscriptionPackagesService.findActiveById(
      packageId,
      CustomerServiceType.PREMIUM_MEMBERSHIP,
    );

    if (!pkg) {
      throw new BadRequestException(
        'Subscription package not found or inactive',
      );
    }

    // Map package duration to enum (assert value is valid)
    const duration = pkg.duration_months as SubscriptionDuration;
    if (!Object.values(SubscriptionDuration).includes(duration)) {
      throw new BadRequestException(
        'Unsupported subscription package duration',
      );
    }

    const fee = Number(pkg.price);

    // Validate payment amount matches subscription fee
    if (Math.abs(paymentSlipData.payment_amount - fee) > 0.01) {
      throw new BadRequestException(
        `Payment amount (${paymentSlipData.payment_amount}) does not match subscription fee (${fee})`,
      );
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const paymentRepo = transactionalEntityManager.getRepository(Payment);

        // Apply the service with pending payment status
        const serviceResult = await this.applyService(
          customerId,
          CustomerServiceType.PREMIUM_MEMBERSHIP,
          {
            subscription: {
              duration,
              fee,
            },
          },
        );

        // Link chosen package to the service
        await transactionalEntityManager.update(
          this.customerServiceRepo.target,
          { id: serviceResult.service.id },
          { subscription_package_id: packageId },
        );

        // Create payment record with slip data submitted immediately
        const manualIntentId = `manual-${Date.now()}-${customerId}`;
        // Since the slip is provided at application time, mark it as submitted immediately
        const paymentEntity: Partial<Payment> = {
          customer_id: customerId,
          service_id: serviceResult.service.id,
          payment_type: PaymentType.SUBSCRIPTION,
          payment_method: PaymentMethod.MANUAL_TRANSFER,
          amount: fee,
          currency: 'USD',
          // Directly mark as slip submitted so it can be approved without extra user step
          status: PaymentStatus.PENDING,
          // status: PaymentStatus.PAYMENT_SLIP_SUBMITTED,
          description: `Premium Membership - ${duration} months (Manual Payment)`,
          payment_intent_id: manualIntentId,
          external_payment_id: manualIntentId,
          payment_url: undefined,
          payment_url_expires_at: undefined,
          payment_slip_url: paymentSlipData.payment_slip_url,
          payment_slip_filename: paymentSlipData.payment_slip_filename,
          payment_reference: paymentSlipData.payment_reference,
          payment_slip_submitted_at: new Date(),
          payment_metadata: { package_id: packageId },
          subscription_package_id: packageId,
        };
        const paymentRecord = await paymentRepo.save(paymentEntity);

        return {
          status: 'pending',
          service: serviceResult.service,
          payment: {
            payment_id: paymentRecord.id,
            amount: fee,
            currency: 'USD',
            payment_slip_filename: paymentRecord.payment_slip_filename,
            submitted_at: paymentRecord.payment_slip_submitted_at,
            instructions: 'Payment recorded and pending admin review.',
          },
        };
      },
    );
  }

  async submitPaymentSlipForService(
    customerId: string,
    paymentId: string,
    paymentSlipData: {
      payment_slip_url: string;
      payment_slip_filename: string;
      payment_amount: number;
      payment_reference?: string;
    },
  ) {
    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const paymentRepo = transactionalEntityManager.getRepository(Payment);

        // Find the payment record
        const payment = await paymentRepo.findOne({
          where: {
            id: paymentId,
            customer_id: customerId,
            status: PaymentStatus.PENDING,
          },
          relations: ['service'],
        });

        if (!payment) {
          throw new NotFoundException(
            'Payment record not found or not in pending status',
          );
        }

        // Update payment record with slip information
        await paymentRepo.update(payment.id, {
          payment_slip_url: paymentSlipData.payment_slip_url,
          payment_slip_filename: paymentSlipData.payment_slip_filename,
          payment_reference: paymentSlipData.payment_reference,
          payment_slip_submitted_at: new Date(),
          status: PaymentStatus.PAYMENT_SLIP_SUBMITTED,
        });

        // Get updated payment record
        const updatedPayment = await paymentRepo.findOne({
          where: { id: paymentId },
          relations: ['service'],
        });

        return {
          status: 'payment_slip_submitted',
          message: 'Payment slip submitted successfully. Pending admin review.',
          payment: updatedPayment,
        };
      },
    );
  }

  async approveServicePayment(
    paymentId: string,
    adminUserId: string,
    adminNotes?: string,
  ) {
    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const paymentRepo = transactionalEntityManager.getRepository(Payment);
        const serviceRepo =
          transactionalEntityManager.getRepository(CustomerService);

        // Find the payment record in an approvable status (either initial pending or slip submitted)
        const approvableStatuses = [
          PaymentStatus.PENDING,
          PaymentStatus.PAYMENT_SLIP_SUBMITTED,
        ];
        const payment = await paymentRepo.findOne({
          where: {
            id: paymentId,
            status: In(approvableStatuses),
          },
          relations: ['service'],
        });

        if (!payment) {
          throw new NotFoundException(
            'Payment record not found or not in an approvable status',
          );
        }

        const now = new Date();

        // Approve payment and activate service
        await paymentRepo.update(payment.id, {
          status: PaymentStatus.SUCCEEDED,
          approved_by_admin_id: adminUserId,
          approved_at: now,
          admin_notes: adminNotes,
          paid_at: now,
        });

        // Ensure subscription expiration & fee are set
        const service = payment.service;
        let subscriptionExpiresAt = service.subscription_expires_at;
        if (!subscriptionExpiresAt && service.subscription_duration) {
          const baseDate = service.applied_at || now;
          const exp = new Date(baseDate);
          exp.setMonth(exp.getMonth() + service.subscription_duration);
          subscriptionExpiresAt = exp;
        }

        await serviceRepo.update(service.id, {
          active: true,
          subscription_expires_at: subscriptionExpiresAt,
          subscription_fee: service.subscription_fee ?? payment.amount,
        });

        return {
          status: 'approved',
          message: 'Payment approved and service activated successfully',
          service_id: service.id,
          subscription_expires_at: subscriptionExpiresAt,
        };
      },
    );
  }

  /**
   * Manual renewal flow using payment slip (no online gateway)
   * Creates a new pending (inactive) service record and a pending payment with slip metadata.
   * Admin must approve via approveServicePayment (same endpoint as initial application).
   */
  async renewPremiumMembershipWithSlip(
    customerId: string,
    packageId: string,
    paymentSlip: {
      payment_slip_url: string;
      payment_slip_filename: string;
      payment_amount: number;
      payment_reference?: string;
    },
  ) {
    // Find latest existing premium membership (active or expired)
    const existing = await this.customerServiceRepo.find({
      where: {
        customer_id: customerId,
        service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
      },
      order: { applied_at: 'DESC' },
      take: 1,
    });

    if (!existing.length) {
      throw new BadRequestException(
        'No existing premium membership to renew. Apply first.',
      );
    }

    const pkg = await this.subscriptionPackagesService.findActiveById(
      packageId,
      CustomerServiceType.PREMIUM_MEMBERSHIP,
    );

    if (!pkg) {
      throw new BadRequestException(
        'Subscription package not found or inactive',
      );
    }

    const duration = pkg.duration_months as SubscriptionDuration;
    if (!Object.values(SubscriptionDuration).includes(duration)) {
      throw new BadRequestException(
        'Unsupported subscription package duration',
      );
    }

    const fee = Number(pkg.price);

    if (Math.abs(paymentSlip.payment_amount - fee) > 0.01) {
      throw new BadRequestException(
        `Payment amount (${paymentSlip.payment_amount}) does not match subscription fee (${fee})`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const serviceRepo = manager.getRepository(CustomerService);
      const paymentRepo = manager.getRepository(Payment);

      // Create new pending renewal service
      const renewalService = serviceRepo.create({
        customer_id: customerId,
        service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
        active: false, // pending approval
        requires_payment: true,
        subscription_duration: duration,
        subscription_fee: fee,
        subscription_expires_at: null, // set upon approval
        subscription_package_id: packageId,
      });
      const savedService = await serviceRepo.save(renewalService);

      // Create pending payment with slip
      const manualIntentId = `manual-renew-${Date.now()}-${customerId}`;
      const paymentEntity: Partial<Payment> = {
        customer_id: customerId,
        service_id: savedService.id,
        payment_type: PaymentType.RENEWAL,
        payment_method: PaymentMethod.MANUAL_TRANSFER,
        amount: fee,
        currency: 'USD',
        status: PaymentStatus.PENDING,
        description: `Premium Membership Renewal - ${duration} months (Manual Payment)`,
        payment_intent_id: manualIntentId,
        external_payment_id: manualIntentId,
        payment_url: undefined,
        payment_url_expires_at: undefined,
        payment_slip_url: paymentSlip.payment_slip_url,
        payment_slip_filename: paymentSlip.payment_slip_filename,
        payment_reference: paymentSlip.payment_reference,
        payment_slip_submitted_at: new Date(),
        payment_metadata: { package_id: packageId },
        subscription_package_id: packageId,
      };
      const paymentRecord = await paymentRepo.save(paymentEntity);

      return {
        status: 'renewal_pending_admin_review',
        renewal_service: savedService,
        payment: {
          payment_id: paymentRecord.id,
          amount: fee,
          currency: 'USD',
          payment_slip_filename: paymentRecord.payment_slip_filename,
          submitted_at: paymentRecord.payment_slip_submitted_at,
          instructions: 'Renewal payment slip submitted. Pending admin review.',
        },
      };
    });
  }

  // --- Premium Membership Renewal ---

  async renewPremiumMembership(
    customerId: string,
    subscriptionParams: {
      duration: SubscriptionDuration;
      fee?: number;
    },
    context?: PaymentAuditContext,
  ) {
    // Check if customer has an existing premium membership (active or expired)
    const existingService = await this.customerServiceRepo.findOne({
      where: {
        customer_id: customerId,
        service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
      },
      order: { applied_at: 'DESC' }, // Get the most recent one
    });

    if (!existingService) {
      throw new BadRequestException(
        'Customer must have an existing premium membership to renew',
      );
    }

    // Calculate subscription fee
    const fee =
      subscriptionParams.fee ||
      this.calculateSubscriptionFee(
        CustomerServiceType.PREMIUM_MEMBERSHIP,
        subscriptionParams.duration,
      );

    // Create payment intent for renewal
    const paymentIntent = await this.paymentService.createPaymentIntent({
      amount: fee * 100, // Convert to cents
      currency: 'USD',
      description: `Premium Membership Renewal - ${subscriptionParams.duration} months`,
      metadata: {
        customer_id: customerId,
        service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
        subscription_duration: subscriptionParams.duration,
        renewal: 'true',
        previous_service_id: existingService.id,
      },
      returnUrl: `${this.configService.get('FRONTEND_URL')}/payment/success`,
      cancelUrl: `${this.configService.get('FRONTEND_URL')}/payment/cancel`,
    });

    // Calculate new expiration date (from current expiration or now, whichever is later)
    const now = new Date();
    const currentExpiration = existingService.subscription_expires_at || now;
    const renewalStartDate = currentExpiration > now ? currentExpiration : now;

    const newExpirationDate = new Date(renewalStartDate);
    newExpirationDate.setMonth(
      newExpirationDate.getMonth() + subscriptionParams.duration,
    );

    // Create new service record for renewal
    const renewalService = this.customerServiceRepo.create({
      customer_id: customerId,
      service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
      active: false, // Will be activated after payment + admin approval
      requires_payment: true,
      subscription_duration: subscriptionParams.duration,
      subscription_expires_at: newExpirationDate,
      subscription_fee: fee,
    });

    const savedRenewalService =
      await this.customerServiceRepo.save(renewalService);

    // Create payment record for renewal
    const paymentRecord = await this.paymentRecordService.createPayment(
      {
        customer_id: customerId,
        service_id: savedRenewalService.id,
        payment_type: PaymentType.RENEWAL,
        payment_method: PaymentMethod.STRIPE,
        amount: fee,
        currency: 'USD',
        description: `Premium Membership Renewal - ${subscriptionParams.duration} months`,
        context,
      },
      paymentIntent,
    );

    // Log that renewal is pending payment and admin approval
    await this.paymentAuditService.logPaymentAction(
      paymentRecord.id,
      customerId,
      PaymentAuditAction.SUBSCRIPTION_RENEWAL_REQUESTED,
      `Premium membership renewal requested for ${subscriptionParams.duration} months`,
      {
        metadata: {
          previous_service_id: existingService.id,
          new_expiration: newExpirationDate.toISOString(),
          fee,
          duration: subscriptionParams.duration,
        },
        context,
      },
    );

    return {
      status: 'renewal_pending_payment',
      renewal_service: savedRenewalService,
      previous_service: existingService,
      payment: {
        payment_id: paymentIntent.id,
        payment_url: paymentIntent.payment_url,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        expires_at: paymentIntent.expires_at,
      },
    };
  }

  async confirmRenewalPayment(
    paymentIntentId: string,
    context?: PaymentAuditContext,
  ) {
    // Confirm payment first
    const paymentConfirmation = await this.confirmPayment(
      paymentIntentId,
      context,
    );

    if (
      paymentConfirmation.status !== 'payment_confirmed_pending_admin_approval'
    ) {
      return paymentConfirmation;
    }

    return {
      ...paymentConfirmation,
      status: 'renewal_payment_confirmed_pending_admin_approval',
      message:
        'Renewal payment confirmed successfully. Service renewal pending admin approval.',
    };
  }

  async approveRenewal(
    renewalServiceId: string,
    reviewerUserId: string,
    context?: PaymentAuditContext,
  ) {
    const renewalResult = await this.approveService(
      renewalServiceId,
      reviewerUserId,
      context,
    );

    if (renewalResult.status === 'activated') {
      // When renewal is approved, deactivate the old service
      const renewalService = renewalResult.service;

      const oldServices = await this.customerServiceRepo.find({
        where: {
          customer_id: renewalService.customer_id,
          service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
          active: true,
        },
      });

      // Filter out the newly activated service
      const servicesToDeactivate = oldServices.filter(
        (s) => s.id !== renewalService.id,
      );

      // Deactivate old services
      for (const oldService of servicesToDeactivate) {
        await this.customerServiceRepo.update(oldService.id, {
          active: false,
        });
      }

      return {
        ...renewalResult,
        status: 'renewal_activated',
        deactivated_services: servicesToDeactivate.map((s) => s.id),
      };
    }

    return renewalResult;
  }

  async rejectRenewal(
    renewalServiceId: string,
    reviewerUserId: string,
    rejectionReason?: string,
  ) {
    const rejectionResult = await this.rejectService(
      renewalServiceId,
      reviewerUserId,
      rejectionReason,
    );

    return {
      ...rejectionResult,
      status: 'renewal_rejected',
    };
  }

  async checkExpiredSubscriptions() {
    const expiredServices = await this.customerServiceRepo.find({
      where: {
        active: true,
        subscription_expires_at: LessThan(new Date()),
      },
    });

    for (const service of expiredServices) {
      await this.customerServiceRepo.update(service.id, {
        active: false,
      });
    }

    return {
      expired_count: expiredServices.length,
      expired_services: expiredServices.map((s) => s.id),
    };
  }

  async getPendingPremiumMemberships(
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<PendingPremiumMembership>> {
    // First, get all premium membership services that are inactive (pending approval)
    const [allPendingServices] = await this.customerServiceRepo.findAndCount({
      where: {
        service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
        active: false,
      },
      relations: ['customer'],
      order: {
        applied_at: 'DESC',
      },
    });

    // Filter services that have successful payments
    let servicesWithPayments: PendingPremiumMembership[] = [];

    for (const service of allPendingServices) {
      // Check if this service has a successful payment
      const payments = await this.paymentRecordService.getPaymentsByService(
        service.id,
        PaymentStatus.PENDING,
      );

      servicesWithPayments = payments.map((payment) => ({
        service_id: service.id,
        customer_id: service.customer_id,
        customer_info: {
          username: service.customer.username,
          email: service.customer.email,
          first_name: service.customer.first_name,
          last_name: service.customer.last_name,
        },
        service_type: service.service_type,
        subscription_duration: service.subscription_duration,
        subscription_fee: service.subscription_fee,
        applied_at: service.applied_at,
        payment_info: {
          payment_id: payment.id,
          amount: payment.amount,
          paid_at: payment.paid_at || payment.updated_at,
          status: payment.status,
          payment_slip_url: payment.payment_slip_url || undefined,
        },
      }));

      // NOTE: If multiple payments exist, this will add multiple entries for the same service.
      // This is intentional to show all payment attempts for admin review.

      // const successfulPayment = payments.find(
      //   (payment) => payment.status === PaymentStatus.PENDING,
      // );

      // if (successfulPayment) {
      //   servicesWithPayments.push({
      //     service_id: service.id,
      //     customer_id: service.customer_id,
      //     customer_info: {
      //       username: service.customer.username,
      //       email: service.customer.email,
      //       first_name: service.customer.first_name,
      //       last_name: service.customer.last_name,
      //     },
      //     service_type: service.service_type,
      //     subscription_duration: service.subscription_duration,
      //     subscription_fee: service.subscription_fee,
      //     applied_at: service.applied_at,
      //     payment_info: {
      //       payment_id: successfulPayment.id,
      //       amount: successfulPayment.amount,
      //       paid_at: successfulPayment.paid_at || successfulPayment.updated_at,
      //       status: successfulPayment.status,
      //       payment_slip_url: successfulPayment.payment_slip_url || undefined,
      //     },
      //   });
      // }
    }

    // Apply pagination to filtered results using utility
    return PaginationUtil.paginateArray(servicesWithPayments, {
      page: options.page,
      limit: options.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });
  }
}
