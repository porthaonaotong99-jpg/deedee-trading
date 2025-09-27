// Price data interface for real-time stock prices
export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  bidPrice?: number;
  askPrice?: number;
  bidSize?: number;
  askSize?: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

// Cache statistics interface
export interface CacheStats {
  size: number;
  subscriptions: number;
  symbols: string[];
}

// Demo service response interfaces
export interface DemoStartResponse {
  message: string;
  subscribedSymbols: string[];
  status: string;
  cacheSize: number;
  lastUpdate: string;
}

export interface SubscriptionResponse {
  message: string;
  symbol: string;
  status: string;
}

export interface PriceUpdateResponse {
  message: string;
  symbol: string;
  newPrice: PriceData | null;
}

export interface StockPriceErrorResponse {
  error: string;
  symbol: string;
  suggestion: string;
}

export interface HealthStatusResponse {
  status: string;
  timestamp: string;
  components: {
    demoService: string;
    realTimePriceService: string;
    webSocketGateway: string;
  };
  cache: {
    size: number;
    symbols: string[];
  };
  subscriptions: {
    count: number;
    symbols: string[];
  };
}

// Union type for stock price response (success or error)
export type StockPriceResponse = PriceData | StockPriceErrorResponse;

// Current prices summary for the demo service
export interface CurrentPricesSummary {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}
