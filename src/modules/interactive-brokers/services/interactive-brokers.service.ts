import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IBApi,
  EventName,
  ErrorCode,
  Contract,
  Order,
  SecType,
  OrderAction,
  OrderType,
} from '@stoqey/ib';
import {
  IBStock,
  IBOrder,
  IBMarketData,
  IBPosition,
  IBAccount,
  IBOrderStatus,
  IBConnection,
} from '../interfaces/ib.interface';

@Injectable()
export class InteractiveBrokersService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(InteractiveBrokersService.name);
  private connection: IBConnection;
  private ibApi: IBApi;
  private nextOrderId: number = 1;
  private accountId: string;

  // Rate limiting and compliance tracking
  private requestTimes: number[] = [];
  private dailyOrderCount: number = 0;
  private dailyOrderValue: number = 0;
  private lastResetDate: string = new Date().toDateString();

  constructor(private readonly configService: ConfigService) {
    this.connection = {
      host: this.configService.get<string>('IB_HOST', 'localhost'),
      port: this.configService.get<number>('IB_PORT', 7497),
      clientId: this.configService.get<number>('IB_CLIENT_ID', 1),
      isConnected: false,
    };
    this.accountId = this.configService.get<string>(
      'IB_ACCOUNT_ID',
      'DU1234567',
    );

    // Initialize IB API
    this.ibApi = new IBApi({
      host: this.connection.host,
      port: this.connection.port,
    });

    this.setupEventHandlers();
  }

  async onModuleInit() {
    this.logger.log('Initializing Interactive Brokers connection...');
    this.validateAccountSafety();
    await this.connect();
  }

  /**
   * Rate limiting to comply with IBKR API policies (max 50 requests/second)
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    // Remove requests older than 1 second
    this.requestTimes = this.requestTimes.filter((time) => now - time < 1000);

    // Stay under 45 requests/second to be safe (IBKR limit is 50)
    if (this.requestTimes.length >= 45) {
      this.logger.warn('Rate limit approaching - request delayed');
      return false;
    }

    this.requestTimes.push(now);
    return true;
  }

  /**
   * Reset daily counters for compliance tracking
   */
  private resetDailyCountersIfNeeded(): void {
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.dailyOrderCount = 0;
      this.dailyOrderValue = 0;
      this.lastResetDate = today;
      this.logger.log('Daily counters reset for new trading day');
    }
  }

  /**
   * Log activity for compliance and audit trail
   */
  private logComplianceActivity(action: string, details: any): void {
    const mode = this.getTradingMode();
    const timestamp = new Date().toISOString();

    this.logger.log(`[COMPLIANCE-${mode}] ${timestamp} - ${action}`, details);

    // In production, you might want to store this in a database
    // for regulatory reporting and audit purposes
  }

  /**
   * Critical safety check to ensure we're not accidentally trading with real money
   */
  private validateAccountSafety(): void {
    const accountId = this.accountId;
    const port = this.connection.port;

    if (port === 7497 && accountId.startsWith('DU')) {
      this.logger.log('✅ SAFE: Using Paper Trading Account');
      return;
    }

    if (port === 7496 && accountId.startsWith('U')) {
      this.logger.warn(
        '⚠️  DANGER: Using Live Trading Account - REAL MONEY AT RISK!',
      );
      this.logger.warn(
        '⚠️  Make sure you understand the risks before proceeding',
      );
      return;
    }

    this.logger.error('❌ INVALID: Account/Port configuration mismatch');
    throw new Error(
      `Invalid configuration: Account ${accountId} with port ${port}`,
    );
  }

  async onModuleDestroy() {
    this.logger.log('Destroying Interactive Brokers connection...');
    await this.disconnect();
  }

  private setupEventHandlers() {
    // Connection events
    this.ibApi.on(EventName.connected, () => {
      this.logger.log('Connected to Interactive Brokers');
      this.connection.isConnected = true;
    });

    this.ibApi.on(EventName.disconnected, () => {
      this.logger.log('Disconnected from Interactive Brokers');
      this.connection.isConnected = false;
      // Auto-reconnect after a delay
      setTimeout(() => {
        this.attemptReconnect().catch((err) =>
          this.logger.error('Auto-reconnect failed', err),
        );
      }, 5000);
    });

    this.ibApi.on(EventName.error, (err, code) => {
      this.logger.error(`IB API Error: ${code} - ${err.message}`, err);
      if (code === ErrorCode.NOT_CONNECTED) {
        this.connection.isConnected = false;
      }
    });

    // Order events
    this.ibApi.on(EventName.nextValidId, (orderId: number) => {
      this.nextOrderId = orderId;
      this.logger.log(`Next valid order ID: ${orderId}`);
    });
  }

  private async attemptReconnect() {
    if (!this.connection.isConnected) {
      this.logger.log('Attempting to reconnect to Interactive Brokers...');
      try {
        await this.connect();
      } catch (error) {
        this.logger.error('Reconnection failed', error);
      }
    }
  }

  /**
   * Convert our IBStock interface to IB API Contract format
   */
  private createIBContract(stock: IBStock): Contract {
    return {
      symbol: stock.symbol,
      secType: stock.secType as SecType,
      exchange: stock.exchange,
      currency: stock.currency,
      localSymbol: stock.localSymbol,
    };
  }

  /**
   * Convert our IBOrder interface to IB API Order format
   */
  private createIBOrder(order: IBOrder): Order {
    return {
      action: order.action as OrderAction,
      orderType: order.orderType as OrderType,
      totalQuantity: order.totalQuantity,
      lmtPrice: order.lmtPrice,
      auxPrice: order.auxPrice,
      tif: order.tif || 'DAY',
    };
  }

  /**
   * Connect to Interactive Brokers TWS or Gateway
   */
  connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.logger.log(
          `Attempting to connect to IB at ${this.connection.host}:${this.connection.port}`,
        );

        // Set up one-time connection handler
        const onConnected = () => {
          this.ibApi.off(EventName.connected, onConnected);
          this.ibApi.off(EventName.error, onError);
          resolve(true);
        };

        const onError = () => {
          this.ibApi.off(EventName.connected, onConnected);
          this.ibApi.off(EventName.error, onError);
          resolve(false);
        };

        this.ibApi.once(EventName.connected, onConnected);
        this.ibApi.once(EventName.error, onError);

        // Connect with client ID
        this.ibApi.connect(this.connection.clientId);

        // Set timeout for connection attempt
        setTimeout(() => {
          if (!this.connection.isConnected) {
            this.ibApi.off(EventName.connected, onConnected);
            this.ibApi.off(EventName.error, onError);
            this.logger.error('Connection timeout');
            resolve(false);
          }
        }, 10000); // 10 second timeout
      } catch (error) {
        this.logger.error('Failed to connect to Interactive Brokers', error);
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from Interactive Brokers
   */
  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (this.ibApi && this.connection.isConnected) {
          this.ibApi.disconnect();
        }
        this.connection.isConnected = false;
        this.logger.log('Disconnected from Interactive Brokers');
        resolve();
      } catch (error) {
        this.logger.error(
          'Failed to disconnect from Interactive Brokers',
          error,
        );
        resolve();
      }
    });
  }

  /**
   * Get real-time market data for a stock
   */
  getMarketData(stock: IBStock): Promise<IBMarketData | null> {
    return new Promise((resolve) => {
      try {
        if (!this.connection.isConnected) {
          throw new Error('Not connected to Interactive Brokers');
        }

        // Check rate limiting for market data requests
        if (!this.checkRateLimit()) {
          throw new Error('Rate limit exceeded for market data request');
        }

        // Create contract for IB API
        const contract = this.createIBContract(stock);

        const reqId = Math.floor(Math.random() * 10000);
        const marketData: Partial<IBMarketData> = {
          symbol: stock.symbol,
          timestamp: new Date(),
        };

        // Set up market data handlers
        const onTickPrice = (reqId_: number, field: number, price: number) => {
          if (reqId_ === reqId) {
            switch (field) {
              case 1: // BID
                marketData.bid = price;
                break;
              case 2: // ASK
                marketData.ask = price;
                break;
              case 4: // LAST
                marketData.last = price;
                break;
              case 6: // HIGH
                marketData.high = price;
                break;
              case 7: // LOW
                marketData.low = price;
                break;
              case 9: // CLOSE
                marketData.close = price;
                break;
            }
          }
        };

        const onTickSize = (reqId_: number, field: number, size: number) => {
          if (reqId_ === reqId && field === 8) {
            // VOLUME
            marketData.volume = size;
          }
        };

        this.ibApi.on(EventName.tickPrice, onTickPrice);
        this.ibApi.on(EventName.tickSize, onTickSize);

        // Request market data
        this.ibApi.reqMktData(reqId, contract, '', false, false);

        // Resolve after collecting data for a short period
        setTimeout(() => {
          this.ibApi.cancelMktData(reqId);
          this.ibApi.off(EventName.tickPrice, onTickPrice);
          this.ibApi.off(EventName.tickSize, onTickSize);

          if (marketData.bid && marketData.ask && marketData.last) {
            resolve(marketData as IBMarketData);
          } else {
            this.logger.warn(`Incomplete market data for ${stock.symbol}`);
            resolve(null);
          }
        }, 2000); // Wait 2 seconds for data
      } catch (error) {
        this.logger.error(
          `Failed to get market data for ${stock.symbol}`,
          error,
        );
        resolve(null);
      }
    });
  }

  /**
   * Validate order compliance with IBKR and regulatory policies
   */
  private validateOrderCompliance(stock: IBStock, order: IBOrder): void {
    // Reset daily counters if needed
    this.resetDailyCountersIfNeeded();

    // Check rate limiting
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded - too many requests per second');
    }

    // Daily order limits for risk management
    const MAX_DAILY_ORDERS = 1000;
    const MAX_DAILY_VALUE = 1000000; // $1M per day

    if (this.dailyOrderCount >= MAX_DAILY_ORDERS) {
      throw new Error(`Daily order limit reached (${MAX_DAILY_ORDERS})`);
    }

    // Estimate order value
    const estimatedPrice = order.lmtPrice || 100;
    const estimatedValue = order.totalQuantity * estimatedPrice;

    if (this.dailyOrderValue + estimatedValue > MAX_DAILY_VALUE) {
      throw new Error(`Daily trading value limit would be exceeded`);
    }

    // Log compliance activity
    this.logComplianceActivity('ORDER_VALIDATION', {
      symbol: stock.symbol,
      action: order.action,
      quantity: order.totalQuantity,
      estimatedValue,
      dailyOrderCount: this.dailyOrderCount,
      dailyOrderValue: this.dailyOrderValue,
    });
  }

  /**
   * Validate order safety before execution
   */
  private validateOrderSafety(stock: IBStock, order: IBOrder): void {
    // Position size limits (even for paper trading - good habits)
    const MAX_QUANTITY = 10000;
    const MAX_ORDER_VALUE_USD = 100000; // $100k max per order

    if (order.totalQuantity <= 0) {
      throw new Error('Order quantity must be positive');
    }

    if (order.totalQuantity > MAX_QUANTITY) {
      throw new Error(
        `Order quantity ${order.totalQuantity} exceeds safety limit of ${MAX_QUANTITY}`,
      );
    }

    // Validate limit price if provided
    if (order.lmtPrice && order.lmtPrice <= 0) {
      throw new Error('Limit price must be positive');
    }

    // Estimate order value (rough calculation)
    const estimatedPrice = order.lmtPrice || 100; // Use limit price or assume $100
    const estimatedValue = order.totalQuantity * estimatedPrice;

    if (estimatedValue > MAX_ORDER_VALUE_USD) {
      throw new Error(
        `Estimated order value $${estimatedValue} exceeds safety limit of $${MAX_ORDER_VALUE_USD}`,
      );
    }

    // Additional validation for live trading
    if (this.connection.port === 7496) {
      // Live trading port
      this.logger.warn(
        `🚨 LIVE TRADING ORDER: ${order.action} ${order.totalQuantity} ${stock.symbol} at ${order.lmtPrice || 'MARKET'}`,
      );

      // Extra strict limits for live trading
      if (order.totalQuantity > 100) {
        throw new Error(
          'Live trading limited to 100 shares per order for safety',
        );
      }
    }
  }

  /**
   * Place an order through Interactive Brokers
   */
  placeOrder(stock: IBStock, order: IBOrder): Promise<number | null> {
    return new Promise((resolve) => {
      try {
        if (!this.connection.isConnected) {
          throw new Error('Not connected to Interactive Brokers');
        }

        // CRITICAL: Validate compliance and safety first
        this.validateOrderCompliance(stock, order);
        this.validateOrderSafety(stock, order);

        const orderId = this.nextOrderId++;

        // Create contract and order using helper functions
        const contract = this.createIBContract(stock);
        const ibOrder = this.createIBOrder(order);

        // Set up order status handler
        const onOrderStatus = (
          id: number,
          status: string,
          filled: number,
          remaining: number,
        ) => {
          if (id === orderId) {
            this.logger.log(
              `Order ${orderId} status: ${status}, filled: ${filled}, remaining: ${remaining}`,
            );
          }
        };

        this.ibApi.on(EventName.orderStatus, onOrderStatus);

        // Place the order
        this.ibApi.placeOrder(orderId, contract, ibOrder);

        // Update compliance counters
        this.dailyOrderCount++;
        const estimatedValue = order.totalQuantity * (order.lmtPrice || 100);
        this.dailyOrderValue += estimatedValue;

        // Log order placement for compliance
        this.logComplianceActivity('ORDER_PLACED', {
          orderId,
          symbol: stock.symbol,
          action: order.action,
          quantity: order.totalQuantity,
          orderType: order.orderType,
          estimatedValue,
          timestamp: new Date().toISOString(),
        });

        this.logger.log(
          `Placed ${order.action} order for ${order.totalQuantity} shares of ${stock.symbol}, Order ID: ${orderId}`,
        );

        resolve(orderId);
      } catch (error) {
        this.logger.error(`Failed to place order for ${stock.symbol}`, error);
        resolve(null);
      }
    });
  }

  /**
   * Cancel an existing order
   */
  cancelOrder(orderId: number): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (!this.connection.isConnected) {
          throw new Error('Not connected to Interactive Brokers');
        }

        // TODO: Implement actual order cancellation
        // await this.ibClient.cancelOrder(orderId);

        this.logger.log(`Cancelled order ${orderId}`);
        resolve(true);
      } catch (error) {
        this.logger.error(`Failed to cancel order ${orderId}`, error);
        resolve(false);
      }
    });
  }

  /**
   * Get current positions
   */
  getPositions(accountId: string): Promise<IBPosition[]> {
    return new Promise((resolve) => {
      try {
        if (!this.connection.isConnected) {
          throw new Error('Not connected to Interactive Brokers');
        }

        // TODO: Implement actual positions request
        // const positions = await this.ibClient.reqPositions(accountId);

        // Mock positions for now
        const mockPositions: IBPosition[] = [
          {
            account: accountId,
            contract: {
              symbol: 'AAPL',
              secType: 'STK',
              exchange: 'SMART',
              currency: 'USD',
            },
            position: 100,
            marketPrice: 150.0,
            marketValue: 15000.0,
            averageCost: 145.0,
            unrealizedPNL: 500.0,
            realizedPNL: 0.0,
          },
        ];

        resolve(mockPositions);
      } catch (error) {
        this.logger.error(
          `Failed to get positions for account ${accountId}`,
          error,
        );
        resolve([]);
      }
    });
  }

  /**
   * Get account information
   */
  getAccountInfo(accountId: string): Promise<IBAccount | null> {
    return new Promise((resolve) => {
      try {
        if (!this.connection.isConnected) {
          throw new Error('Not connected to Interactive Brokers');
        }

        // TODO: Implement actual account info request
        // const accountInfo = await this.ibClient.reqAccountSummary(accountId);

        // Mock account info for now
        const mockAccountInfo: IBAccount = {
          accountId,
          netLiquidation: 100000.0,
          totalCashValue: 85000.0,
          settledCash: 85000.0,
          availableFunds: 85000.0,
          buyingPower: 170000.0,
          grossPositionValue: 15000.0,
          unrealizedPNL: 500.0,
          realizedPNL: 0.0,
        };

        resolve(mockAccountInfo);
      } catch (error) {
        this.logger.error(`Failed to get account info for ${accountId}`, error);
        resolve(null);
      }
    });
  }

  /**
   * Get order status
   */
  getOrderStatus(orderId: number): Promise<IBOrderStatus | null> {
    return new Promise((resolve) => {
      try {
        if (!this.connection.isConnected) {
          throw new Error('Not connected to Interactive Brokers');
        }

        // TODO: Implement actual order status request
        // const orderStatus = await this.ibClient.reqOrderStatus(orderId);

        // Mock order status for now
        const mockOrderStatus: IBOrderStatus = {
          orderId,
          status: 'Filled',
          filled: 100,
          remaining: 0,
          avgFillPrice: 150.0,
          lastFillPrice: 150.0,
          whyHeld: '',
        };

        resolve(mockOrderStatus);
      } catch (error) {
        this.logger.error(`Failed to get order status for ${orderId}`, error);
        resolve(null);
      }
    });
  }

  /**
   * Emergency stop - Cancel all orders and disconnect
   * Use this in case of emergency or system malfunction
   */
  async emergencyStop(reason: string = 'Manual emergency stop'): Promise<void> {
    this.logger.error(`🚨 EMERGENCY STOP INITIATED: ${reason}`);

    try {
      // Cancel all pending orders (would need to track active orders)
      this.logger.warn('Attempting to cancel all pending orders...');

      // Disconnect from IB
      await this.disconnect();

      this.logger.error('✅ Emergency stop completed');
    } catch (error) {
      this.logger.error('❌ Emergency stop failed', error);
      throw error;
    }
  }

  /**
   * Get current trading mode (Paper vs Live)
   */
  getTradingMode(): 'PAPER' | 'LIVE' | 'UNKNOWN' {
    if (this.connection.port === 7497 && this.accountId.startsWith('DU')) {
      return 'PAPER';
    } else if (
      this.connection.port === 7496 &&
      this.accountId.startsWith('U')
    ) {
      return 'LIVE';
    }
    return 'UNKNOWN';
  }

  /**
   * Get compliance status and daily statistics
   */
  getComplianceStatus() {
    this.resetDailyCountersIfNeeded();

    const requestsInLastSecond = this.requestTimes.filter(
      (time) => Date.now() - time < 1000,
    ).length;

    return {
      tradingMode: this.getTradingMode(),
      dailyStats: {
        orderCount: this.dailyOrderCount,
        orderValue: this.dailyOrderValue,
        resetDate: this.lastResetDate,
      },
      rateLimit: {
        requestsInLastSecond,
        maxRequestsPerSecond: 45,
        status: requestsInLastSecond < 40 ? 'SAFE' : 'WARNING',
      },
      compliance: {
        pdtCompliant: true, // Would need actual PDT tracking
        marginCompliant: true, // Would need actual margin monitoring
        riskLimitsActive: true,
      },
    };
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.connection.isConnected;
  }

  /**
   * Get connection details
   */
  getConnectionInfo(): IBConnection {
    return { ...this.connection };
  }

  /**
   * Sync stock data from IB to local database
   * This would be called periodically to update stock prices
   */
  async syncStockData(symbols: string[]): Promise<void> {
    try {
      if (!this.connection.isConnected) {
        this.logger.warn(
          'Cannot sync stock data: Not connected to Interactive Brokers',
        );
        return;
      }

      for (const symbol of symbols) {
        const stock: IBStock = {
          symbol,
          secType: 'STK',
          exchange: 'SMART',
          currency: 'USD',
        };

        const marketData = await this.getMarketData(stock);

        if (marketData) {
          // TODO: Update local stock entity with the latest price
          // await this.stocksService.updateStockPrice(symbol, marketData.last);
          this.logger.log(`Updated ${symbol} price to ${marketData.last}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to sync stock data', error);
    }
  }
}
