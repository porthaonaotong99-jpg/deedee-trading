import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvestmentTransaction } from '../investment-info/entities/investment-transaction.entity';
import { CustomerStock } from '../customer-stocks/entities/customer-stock.entity';
import {
  DashboardChartQueryDto,
  PortfolioPerformanceDto,
  MarketPerformanceDto,
  ChartDataPointDto,
} from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(InvestmentTransaction)
    private readonly investmentTransactionRepo: Repository<InvestmentTransaction>,
    @InjectRepository(CustomerStock)
    private readonly customerStockRepo: Repository<CustomerStock>,
  ) {}

  async getInvestmentPortfolioPerformance(
    customerId: string,
    query: DashboardChartQueryDto,
  ): Promise<PortfolioPerformanceDto> {
    const year = query.year || new Date().getFullYear();
    const currency = 'USD';

    const transactions = await this.investmentTransactionRepo
      .createQueryBuilder('t')
      .where('t.customer_id = :customerId', { customerId })
      .andWhere('t.transaction_type = :type', { type: 'investment_approved' })
      .orderBy('t.effective_date', 'ASC')
      .getMany();

    const monthlyData = this.generateMonthlyInvestmentData(transactions, year);
    const currentValue = this.calculateCurrentInvestmentValue(transactions);
    const startOfYearValue = this.calculateInvestmentValueAtDate(
      transactions,
      new Date(year, 0, 1),
    );
    const ytdPercentChange =
      startOfYearValue > 0
        ? ((currentValue - startOfYearValue) / startOfYearValue) * 100
        : 0;

    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);

    const formatPercent = (value: number) => {
      const sign = value >= 0 ? '+' : '';
      return `${sign}${value.toFixed(2)}%`;
    };

    return {
      currentValue,
      displayCurrentValue: formatCurrency(currentValue),
      ytdPercentChange: Number(ytdPercentChange.toFixed(2)),
      displayYtdPercent: formatPercent(ytdPercentChange),
      chartData: monthlyData.map((point) => ({
        ...point,
        displayValue: formatCurrency(point.value),
      })),
      description: 'this year',
    };
  }

  async getGlobalMarketPerformance(
    customerId: string,
    query: DashboardChartQueryDto,
  ): Promise<MarketPerformanceDto> {
    const year = query.year || new Date().getFullYear();
    const currency = 'USD';

    const customerStocks = await this.customerStockRepo
      .createQueryBuilder('cs')
      .leftJoinAndSelect('cs.stock', 'stock')
      .where('cs.customer_id = :customerId', { customerId })
      .orderBy('cs.created_at', 'ASC')
      .getMany();

    const monthlyData = this.generateMonthlyStockData(customerStocks, year);
    const currentValue = this.calculateCurrentStockValue(customerStocks);
    const startOfYearValue = this.calculateStockValueAtDate(
      customerStocks,
      new Date(year, 0, 1),
    );
    const ytdPercentChange =
      startOfYearValue > 0
        ? ((currentValue - startOfYearValue) / startOfYearValue) * 100
        : 0;

    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);

    const formatPercent = (value: number) => {
      const sign = value >= 0 ? '+' : '';
      return `${sign}${value.toFixed(2)}%`;
    };

    return {
      currentValue,
      displayCurrentValue: formatCurrency(currentValue),
      ytdPercentChange: Number(ytdPercentChange.toFixed(2)),
      displayYtdPercent: formatPercent(ytdPercentChange),
      chartData: monthlyData.map((point) => ({
        ...point,
        displayValue: formatCurrency(point.value),
      })),
      description: 'this year',
    };
  }

  private generateMonthlyInvestmentData(
    transactions: InvestmentTransaction[],
    year: number,
  ): ChartDataPointDto[] {
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

    const monthlyData: ChartDataPointDto[] = [];
    let previousValue = 0;

    for (let month = 0; month < 12; month++) {
      const endOfMonth = new Date(year, month + 1, 0);
      const currentValue = this.calculateInvestmentValueAtDate(
        transactions,
        endOfMonth,
      );

      // Calculate monthly profit as difference from previous month
      const monthlyProfit = month === 0 ? 0 : currentValue - previousValue;

      monthlyData.push({
        month: monthNames[month],
        value: currentValue,
        profit: monthlyProfit,
        displayValue: '',
        displayProfit: '',
      });

      previousValue = currentValue;
    }

    return monthlyData;
  }

  private generateMonthlyStockData(
    customerStocks: CustomerStock[],
    year: number,
  ): ChartDataPointDto[] {
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

    const monthlyData: ChartDataPointDto[] = [];
    let previousValue = 0;

    for (let month = 0; month < 12; month++) {
      const endOfMonth = new Date(year, month + 1, 0);
      const currentValue = this.calculateStockValueAtDate(
        customerStocks,
        endOfMonth,
      );

      // Calculate monthly profit as difference from previous month
      const monthlyProfit = month === 0 ? 0 : currentValue - previousValue;

      monthlyData.push({
        month: monthNames[month],
        value: currentValue,
        profit: monthlyProfit,
        displayValue: '',
        displayProfit: '',
      });

      previousValue = currentValue;
    }

    return monthlyData;
  }

  private calculateCurrentInvestmentValue(
    transactions: InvestmentTransaction[],
  ): number {
    return transactions.reduce((total, transaction) => {
      const principal =
        transaction.current_principal ||
        transaction.investment_principal ||
        '0';
      return total + Number(principal);
    }, 0);
  }

  private calculateInvestmentValueAtDate(
    transactions: InvestmentTransaction[],
    targetDate: Date,
  ): number {
    return transactions
      .filter((t) => new Date(t.effective_date) <= targetDate)
      .reduce((total, transaction) => {
        const principal = transaction.investment_principal || '0';
        return total + Number(principal);
      }, 0);
  }

  private calculateCurrentStockValue(customerStocks: CustomerStock[]): number {
    return customerStocks.reduce((total, stock) => {
      const value = stock.market_value || stock.cost_basis || 0;
      return total + value;
    }, 0);
  }

  private calculateStockValueAtDate(
    customerStocks: CustomerStock[],
    targetDate: Date,
  ): number {
    return customerStocks
      .filter((stock) => new Date(stock.created_at) <= targetDate)
      .reduce((total, stock) => {
        const value = stock.cost_basis || 0;
        return total + value;
      }, 0);
  }
}
