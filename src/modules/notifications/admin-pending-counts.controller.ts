import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { handleSuccessOne } from '../../common/utils/response.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CustomerService,
  CustomerServiceType,
} from '../customers/entities/customer-service.entity';
import {
  CustomerStockPick,
  CustomerPickStatus,
} from '../stock-picks/entities/customer-stock-pick.entity';
import { TransferHistory } from '../transfer-history/entities/transfer-history.entity';
import {
  InvestmentRequest,
  InvestmentRequestStatus,
} from '../investment-info/entities/investment-request.entity';
import { KycStatus } from '../customers/entities/customer-kyc.entity';
import { TransferStatus, TransferIdentify } from '../../common/enums';

interface PendingCounts {
  // Services
  services: {
    premiumMembership: number;
    internationalStockAccounts: number;
    guaranteedReturns: number;
    total: number;
  };
  // Payments
  payments: {
    subscriptionPayments: number; // Premium membership payments
    stockPickPayments: number;
    deposits: number; // Top-up requests
    withdrawals: number;
    investmentPayments: number;
    total: number;
  };
  // Grand total
  grandTotal: number;
}

@ApiTags('admin-pending-counts')
@ApiBearerAuth()
@Controller('admin/pending-counts')
@UseGuards(JwtAuthGuard)
export class AdminPendingCountsController {
  constructor(
    @InjectRepository(CustomerService)
    private readonly customerServiceRepo: Repository<CustomerService>,
    @InjectRepository(CustomerStockPick)
    private readonly customerStockPickRepo: Repository<CustomerStockPick>,
    @InjectRepository(TransferHistory)
    private readonly transferHistoryRepo: Repository<TransferHistory>,
    @InjectRepository(InvestmentRequest)
    private readonly investmentRequestRepo: Repository<InvestmentRequest>,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get pending counts for admin dashboard sidebar',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending counts retrieved successfully',
  })
  async getPendingCounts() {
    // Services - Count services with pending KYC (by joining with kyc table)
    const [premiumMembership, internationalStockAccounts, guaranteedReturns] =
      await Promise.all([
        // Premium Membership - services with pending KYC
        this.customerServiceRepo
          .createQueryBuilder('s')
          .leftJoin('s.kyc', 'k')
          .where('s.service_type = :type', {
            type: CustomerServiceType.PREMIUM_MEMBERSHIP,
          })
          .andWhere('k.status = :status', { status: KycStatus.PENDING })
          .getCount(),
        // International Stock Accounts - services with pending KYC
        this.customerServiceRepo
          .createQueryBuilder('s')
          .leftJoin('s.kyc', 'k')
          .where('s.service_type = :type', {
            type: CustomerServiceType.INTERNATIONAL_STOCK_ACCOUNT,
          })
          .andWhere('k.status = :status', { status: KycStatus.PENDING })
          .getCount(),
        // Guaranteed Returns - services with pending KYC
        this.customerServiceRepo
          .createQueryBuilder('s')
          .leftJoin('s.kyc', 'k')
          .where('s.service_type = :type', {
            type: CustomerServiceType.GUARANTEED_RETURNS,
          })
          .andWhere('k.status = :status', { status: KycStatus.PENDING })
          .getCount(),
      ]);

    const servicesTotal =
      premiumMembership + internationalStockAccounts + guaranteedReturns;

    // Payments - Count pending payments/approvals
    const [
      subscriptionPayments,
      stockPickPayments,
      deposits,
      withdrawals,
      investmentPayments,
    ] = await Promise.all([
      // Subscription Payments - Premium membership requiring payment (unused for now, always 0)
      Promise.resolve(0),
      // Stock Pick Payments - Payment submitted, awaiting approval
      this.customerStockPickRepo.count({
        where: {
          status: CustomerPickStatus.PAYMENT_SUBMITTED,
        },
      }),
      // Deposits (Top-ups) - Pending approval
      this.transferHistoryRepo.count({
        where: {
          status: TransferStatus.PENDING,
          identify: TransferIdentify.RECHARGE,
        },
      }),
      // Withdrawals - Pending approval
      this.transferHistoryRepo.count({
        where: {
          status: TransferStatus.PENDING,
          identify: TransferIdentify.WITHDRAW,
        },
      }),
      // Investment Payments - Pending approval
      this.investmentRequestRepo.count({
        where: {
          status: InvestmentRequestStatus.PENDING,
        },
      }),
    ]);

    const paymentsTotal =
      subscriptionPayments +
      stockPickPayments +
      deposits +
      withdrawals +
      investmentPayments;

    const grandTotal = servicesTotal + paymentsTotal;

    const counts: PendingCounts = {
      services: {
        premiumMembership,
        internationalStockAccounts,
        guaranteedReturns,
        total: servicesTotal,
      },
      payments: {
        subscriptionPayments,
        stockPickPayments,
        deposits,
        withdrawals,
        investmentPayments,
        total: paymentsTotal,
      },
      grandTotal,
    };

    return handleSuccessOne({
      data: counts,
      message: 'Pending counts retrieved successfully',
    });
  }
}
