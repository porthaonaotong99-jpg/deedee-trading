import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { User } from '../users/entities/user.entity';
import {
  InvestmentTransaction,
  TransactionType,
} from '../investment-info/entities/investment-transaction.entity';
import {
  InvestmentRequest,
  InvestmentRequestStatus,
} from '../investment-info/entities/investment-request.entity';
import { TransferHistory } from '../transfer-history/entities/transfer-history.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import {
  CustomerKyc,
  KycStatus,
} from '../customers/entities/customer-kyc.entity';
import {
  CustomerStatus,
  TransferIdentify,
  TransferStatus,
} from '../../common/enums';
import {
  AdminDashboardQueryDto,
  AdminDashboardStatsDto,
  RecentActivityDto,
  AdminRevenueChartDto,
  AdminCustomerGrowthChartDto,
  AdminChartDataPointDto,
} from './dto/admin-dashboard.dto';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(InvestmentTransaction)
    private readonly investmentTransactionRepo: Repository<InvestmentTransaction>,
    @InjectRepository(InvestmentRequest)
    private readonly investmentRequestRepo: Repository<InvestmentRequest>,
    @InjectRepository(TransferHistory)
    private readonly transferHistoryRepo: Repository<TransferHistory>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(CustomerKyc)
    private readonly customerKycRepo: Repository<CustomerKyc>,
  ) {}

  private formatCurrency(value: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  private formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  async getAdminStats(): Promise<AdminDashboardStatsDto> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total customers
    const totalCustomers = await this.customerRepo.count();

    // New customers this month
    const newCustomersThisMonth = await this.customerRepo.count({
      where: {
        created_at: MoreThanOrEqual(startOfMonth),
      },
    });

    // Verified customers
    const verifiedCustomers = await this.customerRepo.count({
      where: {
        isVerify: true,
      },
    });

    // Active customers
    const activeCustomers = await this.customerRepo.count({
      where: {
        status: CustomerStatus.ACTIVE,
      },
    });

    // Total staff
    const totalStaff = await this.userRepo.count();

    // Total investments (sum of approved investment amounts)
    const investmentResult = await this.investmentTransactionRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(CAST(t.amount AS DECIMAL)), 0)', 'total')
      .where('t.transaction_type = :type', {
        type: TransactionType.INVESTMENT_APPROVED,
      })
      .getRawOne<{ total: string }>();
    const totalInvestments = parseFloat(investmentResult?.total || '0');

    // Pending investment requests (use InvestmentRequest entity)
    const pendingInvestmentRequests = await this.investmentRequestRepo.count({
      where: {
        status: InvestmentRequestStatus.PENDING,
      },
    });

    // Pending return requests (use TransactionType.RETURN_REQUEST with pending status)
    const pendingReturnRequests = await this.investmentTransactionRepo.count({
      where: {
        transaction_type: TransactionType.RETURN_REQUEST,
      },
    });

    // Pending topup requests
    const pendingTopupRequests = await this.transferHistoryRepo.count({
      where: {
        status: TransferStatus.PENDING,
        identify: TransferIdentify.RECHARGE,
      },
    });

    // Total wallet balance
    const walletResult = await this.walletRepo
      .createQueryBuilder('w')
      .select('COALESCE(SUM(CAST(w.balance AS DECIMAL)), 0)', 'total')
      .getRawOne<{ total: string }>();
    const totalWalletBalance = parseFloat(walletResult?.total || '0');

    // Pending KYC requests
    const pendingKycRequests = await this.customerKycRepo.count({
      where: {
        status: KycStatus.PENDING,
      },
    });

    // Total revenue (same as total investments for now)
    const totalRevenue = totalInvestments;

    return {
      totalCustomers,
      newCustomersThisMonth,
      verifiedCustomers,
      activeCustomers,
      totalStaff,
      totalInvestments,
      displayTotalInvestments: this.formatCurrency(totalInvestments),
      pendingInvestmentRequests,
      pendingReturnRequests,
      pendingTopupRequests,
      totalWalletBalance,
      displayTotalWalletBalance: this.formatCurrency(totalWalletBalance),
      pendingKycRequests,
      totalRevenue,
      displayTotalRevenue: this.formatCurrency(totalRevenue),
    };
  }

  async getRecentActivities(limit = 20): Promise<RecentActivityDto[]> {
    const activities: RecentActivityDto[] = [];

    // Get recent customers
    const recentCustomers = await this.customerRepo.find({
      order: { created_at: 'DESC' },
      take: 5,
    });

    for (const customer of recentCustomers) {
      activities.push({
        id: `customer-${customer.id}`,
        type: 'customer_registration',
        title: 'New Customer Registration',
        description: `${customer.first_name} ${customer.last_name || ''} registered`,
        entityId: customer.id,
        entityType: 'customer',
        timestamp: customer.created_at,
        customerName:
          `${customer.first_name} ${customer.last_name || ''}`.trim(),
        amount: null,
        displayAmount: null,
      });
    }

    // Get recent investment requests (use InvestmentRequest entity)
    const recentInvestmentRequests = await this.investmentRequestRepo.find({
      where: {
        status: InvestmentRequestStatus.PENDING,
      },
      relations: ['customer'],
      order: { created_at: 'DESC' },
      take: 5,
    });

    for (const inv of recentInvestmentRequests) {
      const amount = parseFloat(String(inv.amount || '0'));
      activities.push({
        id: `investment-${inv.id}`,
        type: 'investment_request',
        title: 'New Investment Request',
        description: `Investment request of ${this.formatCurrency(amount)}`,
        entityId: inv.id,
        entityType: 'investment_request',
        timestamp: inv.created_at,
        customerName: inv.customer
          ? `${inv.customer.first_name} ${inv.customer.last_name || ''}`.trim()
          : null,
        amount,
        displayAmount: this.formatCurrency(amount),
      });
    }

    // Get recent return requests
    const recentReturns = await this.investmentTransactionRepo.find({
      where: {
        transaction_type: TransactionType.RETURN_REQUEST,
      },
      relations: ['customer'],
      order: { created_at: 'DESC' },
      take: 5,
    });

    for (const ret of recentReturns) {
      const amount = parseFloat(String(ret.amount || '0'));
      activities.push({
        id: `return-${ret.id}`,
        type: 'return_request',
        title: 'New Return Request',
        description: `Return request of ${this.formatCurrency(amount)}`,
        entityId: ret.id,
        entityType: 'investment_transaction',
        timestamp: ret.created_at,
        customerName: ret.customer
          ? `${ret.customer.first_name} ${ret.customer.last_name || ''}`.trim()
          : null,
        amount,
        displayAmount: this.formatCurrency(amount),
      });
    }

    // Get recent topup requests
    const recentTopups = await this.transferHistoryRepo.find({
      where: {
        identify: TransferIdentify.RECHARGE,
      },
      relations: ['customer'],
      order: { created_at: 'DESC' },
      take: 5,
    });

    for (const topup of recentTopups) {
      const amount = parseFloat(String(topup.amount || '0'));
      activities.push({
        id: `topup-${topup.id}`,
        type: 'topup_request',
        title: 'New Topup Request',
        description: `Topup request of ${this.formatCurrency(amount)}`,
        entityId: topup.id,
        entityType: 'transfer_history',
        timestamp: topup.created_at,
        customerName: topup.customer
          ? `${topup.customer.first_name} ${topup.customer.last_name || ''}`.trim()
          : null,
        amount,
        displayAmount: this.formatCurrency(amount),
      });
    }

    // Sort all activities by timestamp descending
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return activities.slice(0, limit);
  }

  async getRevenueChart(
    query: AdminDashboardQueryDto,
  ): Promise<AdminRevenueChartDto> {
    const year = query.year || new Date().getFullYear();
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const monthNamesFull = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const chartData: AdminChartDataPointDto[] = [];
    let total = 0;

    for (let month = 0; month < 12; month++) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const result = await this.investmentTransactionRepo
        .createQueryBuilder('t')
        .select('COALESCE(SUM(CAST(t.amount AS DECIMAL)), 0)', 'total')
        .where('t.transaction_type = :type', {
          type: TransactionType.INVESTMENT_APPROVED,
        })
        .andWhere('t.effective_date >= :startDate', { startDate })
        .andWhere('t.effective_date <= :endDate', { endDate })
        .getRawOne<{ total: string }>();

      const value = parseFloat(result?.total || '0');
      total += value;

      chartData.push({
        month: monthNames[month],
        monthFull: monthNamesFull[month],
        value,
        displayValue: this.formatCurrency(value),
      });
    }

    return {
      chartData,
      total,
      displayTotal: this.formatCurrency(total),
      year,
    };
  }

  async getCustomerGrowthChart(
    query: AdminDashboardQueryDto,
  ): Promise<AdminCustomerGrowthChartDto> {
    const year = query.year || new Date().getFullYear();
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const monthNamesFull = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const chartData: AdminChartDataPointDto[] = [];
    let cumulativeCustomers = 0;

    // Get count of customers before this year
    const customersBeforeYear = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.created_at < :startOfYear', {
        startOfYear: new Date(year, 0, 1),
      })
      .getCount();

    cumulativeCustomers = customersBeforeYear;

    for (let month = 0; month < 12; month++) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const newCustomers = await this.customerRepo
        .createQueryBuilder('c')
        .where('c.created_at >= :startDate', { startDate })
        .andWhere('c.created_at <= :endDate', { endDate })
        .getCount();

      cumulativeCustomers += newCustomers;

      chartData.push({
        month: monthNames[month],
        monthFull: monthNamesFull[month],
        value: newCustomers,
        displayValue: newCustomers.toString(),
      });
    }

    // Calculate growth percentage
    const startOfYearCount = customersBeforeYear;
    const growthPercent =
      startOfYearCount > 0
        ? ((cumulativeCustomers - startOfYearCount) / startOfYearCount) * 100
        : cumulativeCustomers > 0
          ? 100
          : 0;

    return {
      chartData,
      totalCustomers: cumulativeCustomers,
      growthPercent: Number(growthPercent.toFixed(2)),
      displayGrowthPercent: this.formatPercent(growthPercent),
      year,
    };
  }
}
