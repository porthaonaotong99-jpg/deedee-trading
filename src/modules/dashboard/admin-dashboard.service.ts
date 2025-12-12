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
import { StockPick } from '../stock-picks/entities/stock-pick.entity';
import { CustomerService } from '../customers/entities/customer-service.entity';
import { StockTransaction } from '../stock-transactions/entities/stock-transaction.entity';
import {
  CustomerStockPick,
  CustomerPickStatus,
} from '../stock-picks/entities/customer-stock-pick.entity';
import {
  Payment,
  PaymentStatus,
  PaymentType,
} from '../payments/entities/payment.entity';
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
  AdminStockPicksChartDto,
  AdminSubscriptionsChartDto,
  AdminStockTransactionsChartDto,
} from './dto/admin-dashboard.dto';

// Constants for month names
const MONTH_NAMES_SHORT = [
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

const MONTH_NAMES_FULL = [
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
    @InjectRepository(StockPick)
    private readonly stockPickRepo: Repository<StockPick>,
    @InjectRepository(CustomerService)
    private readonly customerServiceRepo: Repository<CustomerService>,
    @InjectRepository(StockTransaction)
    private readonly stockTransactionRepo: Repository<StockTransaction>,
    @InjectRepository(CustomerStockPick)
    private readonly customerStockPickRepo: Repository<CustomerStockPick>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  // ============== Helper Methods ==============

  private formatCurrency(value: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  private parseDecimal(value: string | null | undefined): number {
    return parseFloat(value || '0');
  }

  private buildChartDataPoint(
    monthIndex: number,
    value: number,
    isCount = false,
  ): AdminChartDataPointDto {
    return {
      month: MONTH_NAMES_SHORT[monthIndex],
      monthFull: MONTH_NAMES_FULL[monthIndex],
      value,
      displayValue: isCount ? value.toString() : this.formatCurrency(value),
    };
  }

  // ============== Admin Stats ==============

  async getAdminStats(): Promise<AdminDashboardStatsDto> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Execute all independent queries in parallel for better performance
    const [
      totalCustomers,
      newCustomersThisMonth,
      verifiedCustomers,
      activeCustomers,
      totalStaff,
      investmentResult,
      pendingInvestmentRequests,
      pendingReturnRequests,
      pendingTopupRequests,
      walletResult,
      pendingKycRequests,
      stockPickPaymentResult,
      subscriptionResult,
      totalApprovedStockTransactions,
    ] = await Promise.all([
      // Total customers
      this.customerRepo.count(),

      // New customers this month
      this.customerRepo.count({
        where: { created_at: MoreThanOrEqual(startOfMonth) },
      }),

      // Verified customers
      this.customerRepo.count({ where: { isVerify: true } }),

      // Active customers
      this.customerRepo.count({ where: { status: CustomerStatus.ACTIVE } }),

      // Total staff
      this.userRepo.count(),

      // Total investments (sum of approved investment amounts)
      this.investmentTransactionRepo
        .createQueryBuilder('t')
        .select('COALESCE(SUM(CAST(t.amount AS DECIMAL)), 0)', 'total')
        .where('t.transaction_type = :type', {
          type: TransactionType.INVESTMENT_APPROVED,
        })
        .getRawOne<{ total: string }>(),

      // Pending investment requests
      this.investmentRequestRepo.count({
        where: { status: InvestmentRequestStatus.PENDING },
      }),

      // Pending return requests
      this.investmentTransactionRepo.count({
        where: { transaction_type: TransactionType.RETURN_REQUEST },
      }),

      // Pending topup requests
      this.transferHistoryRepo.count({
        where: {
          status: TransferStatus.PENDING,
          identify: TransferIdentify.RECHARGE,
        },
      }),

      // Total wallet balance (sum of total_balance + total_cash)
      this.walletRepo
        .createQueryBuilder('w')
        .select(
          'COALESCE(SUM(CAST(w.total_balance AS DECIMAL) + CAST(w.total_cash AS DECIMAL)), 0)',
          'total',
        )
        .getRawOne<{ total: string }>(),

      // Pending KYC requests
      this.customerKycRepo.count({ where: { status: KycStatus.PENDING } }),

      // Total approved stock pick payments
      this.customerStockPickRepo
        .createQueryBuilder('csp')
        .select(
          'COALESCE(SUM(CAST(csp.payment_amount AS DECIMAL)), 0)',
          'total',
        )
        .where('csp.status = :status', { status: CustomerPickStatus.APPROVED })
        .getRawOne<{ total: string }>(),

      // Total approved membership subscriptions from Payment entity
      this.paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(CAST(p.amount AS DECIMAL)), 0)', 'total')
        .where('p.status = :status', { status: PaymentStatus.SUCCEEDED })
        .andWhere('p.payment_type IN (:...types)', {
          types: [
            PaymentType.SUBSCRIPTION,
            PaymentType.RENEWAL,
            PaymentType.UPGRADE,
          ],
        })
        .getRawOne<{ total: string }>(),

      // Total stock transactions count
      this.stockTransactionRepo.count(),
    ]);

    // Parse results
    const totalInvestments = this.parseDecimal(investmentResult?.total);
    const totalWalletBalance = this.parseDecimal(walletResult?.total);
    const totalApprovedStockPickPayments = this.parseDecimal(
      stockPickPaymentResult?.total,
    );
    const totalApprovedMembershipSubscriptions = this.parseDecimal(
      subscriptionResult?.total,
    );
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
      totalApprovedStockPickPayments,
      displayTotalApprovedStockPickPayments: this.formatCurrency(
        totalApprovedStockPickPayments,
      ),
      totalApprovedMembershipSubscriptions,
      displayTotalApprovedMembershipSubscriptions: this.formatCurrency(
        totalApprovedMembershipSubscriptions,
      ),
      totalApprovedStockTransactions,
    };
  }

  // ============== Recent Activities ==============

  async getRecentActivities(limit = 20): Promise<RecentActivityDto[]> {
    // Fetch all activity types in parallel
    const [
      recentCustomers,
      recentInvestmentRequests,
      recentReturns,
      recentTopups,
    ] = await Promise.all([
      this.customerRepo.find({
        order: { created_at: 'DESC' },
        take: 5,
      }),
      this.investmentRequestRepo.find({
        where: { status: InvestmentRequestStatus.PENDING },
        relations: ['customer'],
        order: { created_at: 'DESC' },
        take: 5,
      }),
      this.investmentTransactionRepo.find({
        where: { transaction_type: TransactionType.RETURN_REQUEST },
        relations: ['customer'],
        order: { created_at: 'DESC' },
        take: 5,
      }),
      this.transferHistoryRepo.find({
        where: { identify: TransferIdentify.RECHARGE },
        relations: ['customer'],
        order: { created_at: 'DESC' },
        take: 5,
      }),
    ]);

    const activities: RecentActivityDto[] = [];

    // Map recent customers
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

    // Map recent investment requests
    for (const inv of recentInvestmentRequests) {
      const amount = this.parseDecimal(String(inv.amount));
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

    // Map recent return requests
    for (const ret of recentReturns) {
      const amount = this.parseDecimal(String(ret.amount));
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

    // Map recent topup requests
    for (const topup of recentTopups) {
      const amount = this.parseDecimal(String(topup.amount));
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

    // Sort by timestamp descending and limit
    return activities
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, limit);
  }

  // ============== Chart Methods ==============

  async getRevenueChart(
    query: AdminDashboardQueryDto,
  ): Promise<AdminRevenueChartDto> {
    const year = query.year || new Date().getFullYear();

    // Use single query with GROUP BY for all months instead of 12 separate queries
    const monthlyData = await this.investmentTransactionRepo
      .createQueryBuilder('t')
      .select('EXTRACT(MONTH FROM t.effective_date)', 'month')
      .addSelect('COALESCE(SUM(CAST(t.amount AS DECIMAL)), 0)', 'total')
      .where('t.transaction_type = :type', {
        type: TransactionType.INVESTMENT_APPROVED,
      })
      .andWhere('EXTRACT(YEAR FROM t.effective_date) = :year', { year })
      .groupBy('EXTRACT(MONTH FROM t.effective_date)')
      .getRawMany<{ month: string; total: string }>();

    // Create a map for quick lookup
    const monthMap = new Map<number, number>();
    for (const row of monthlyData) {
      monthMap.set(parseInt(row.month), this.parseDecimal(row.total));
    }

    // Build chart data for all 12 months
    const chartData: AdminChartDataPointDto[] = [];
    let total = 0;

    for (let month = 0; month < 12; month++) {
      const value = monthMap.get(month + 1) || 0;
      total += value;
      chartData.push(this.buildChartDataPoint(month, value, false));
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

    // Get customers before year and monthly new customers in parallel
    const [customersBeforeYear, monthlyNewCustomers] = await Promise.all([
      this.customerRepo
        .createQueryBuilder('c')
        .where('c.created_at < :startOfYear', {
          startOfYear: new Date(year, 0, 1),
        })
        .getCount(),

      this.customerRepo
        .createQueryBuilder('c')
        .select('EXTRACT(MONTH FROM c.created_at)', 'month')
        .addSelect('COUNT(*)', 'count')
        .where('EXTRACT(YEAR FROM c.created_at) = :year', { year })
        .groupBy('EXTRACT(MONTH FROM c.created_at)')
        .getRawMany<{ month: string; count: string }>(),
    ]);

    // Create a map for quick lookup
    const monthMap = new Map<number, number>();
    for (const row of monthlyNewCustomers) {
      monthMap.set(parseInt(row.month), parseInt(row.count));
    }

    // Build chart data
    const chartData: AdminChartDataPointDto[] = [];
    let totalNewThisYear = 0;

    for (let month = 0; month < 12; month++) {
      const value = monthMap.get(month + 1) || 0;
      totalNewThisYear += value;
      chartData.push(this.buildChartDataPoint(month, value, true));
    }

    const cumulativeCustomers = customersBeforeYear + totalNewThisYear;
    const growthPercent =
      customersBeforeYear > 0
        ? (totalNewThisYear / customersBeforeYear) * 100
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

  async getStockPicksChart(
    query: AdminDashboardQueryDto,
  ): Promise<AdminStockPicksChartDto> {
    const year = query.year || new Date().getFullYear();

    // Single query with GROUP BY
    const monthlyData = await this.stockPickRepo
      .createQueryBuilder('sp')
      .select('EXTRACT(MONTH FROM sp.created_at)', 'month')
      .addSelect('COUNT(*)', 'count')
      .where('EXTRACT(YEAR FROM sp.created_at) = :year', { year })
      .groupBy('EXTRACT(MONTH FROM sp.created_at)')
      .getRawMany<{ month: string; count: string }>();

    // Create a map for quick lookup
    const monthMap = new Map<number, number>();
    for (const row of monthlyData) {
      monthMap.set(parseInt(row.month), parseInt(row.count));
    }

    // Build chart data
    const chartData: AdminChartDataPointDto[] = [];
    let total = 0;

    for (let month = 0; month < 12; month++) {
      const value = monthMap.get(month + 1) || 0;
      total += value;
      chartData.push(this.buildChartDataPoint(month, value, true));
    }

    return {
      chartData,
      totalStockPicks: total,
      year,
    };
  }

  async getSubscriptionsChart(
    query: AdminDashboardQueryDto,
  ): Promise<AdminSubscriptionsChartDto> {
    const year = query.year || new Date().getFullYear();

    // Single query with GROUP BY
    const monthlyData = await this.customerServiceRepo
      .createQueryBuilder('cs')
      .select('EXTRACT(MONTH FROM cs.applied_at)', 'month')
      .addSelect('COUNT(*)', 'count')
      .where('EXTRACT(YEAR FROM cs.applied_at) = :year', { year })
      .groupBy('EXTRACT(MONTH FROM cs.applied_at)')
      .getRawMany<{ month: string; count: string }>();

    // Create a map for quick lookup
    const monthMap = new Map<number, number>();
    for (const row of monthlyData) {
      monthMap.set(parseInt(row.month), parseInt(row.count));
    }

    // Build chart data
    const chartData: AdminChartDataPointDto[] = [];
    let total = 0;

    for (let month = 0; month < 12; month++) {
      const value = monthMap.get(month + 1) || 0;
      total += value;
      chartData.push(this.buildChartDataPoint(month, value, true));
    }

    return {
      chartData,
      totalSubscriptions: total,
      year,
    };
  }

  async getStockTransactionsChart(
    query: AdminDashboardQueryDto,
  ): Promise<AdminStockTransactionsChartDto> {
    const year = query.year || new Date().getFullYear();

    // Single query with GROUP BY
    const monthlyData = await this.stockTransactionRepo
      .createQueryBuilder('st')
      .select('EXTRACT(MONTH FROM st.created_at)', 'month')
      .addSelect('COUNT(*)', 'count')
      .where('EXTRACT(YEAR FROM st.created_at) = :year', { year })
      .groupBy('EXTRACT(MONTH FROM st.created_at)')
      .getRawMany<{ month: string; count: string }>();

    // Create a map for quick lookup
    const monthMap = new Map<number, number>();
    for (const row of monthlyData) {
      monthMap.set(parseInt(row.month), parseInt(row.count));
    }

    // Build chart data
    const chartData: AdminChartDataPointDto[] = [];
    let total = 0;

    for (let month = 0; month < 12; month++) {
      const value = monthMap.get(month + 1) || 0;
      total += value;
      chartData.push(this.buildChartDataPoint(month, value, true));
    }

    return {
      chartData,
      totalTransactions: total,
      year,
    };
  }
}
