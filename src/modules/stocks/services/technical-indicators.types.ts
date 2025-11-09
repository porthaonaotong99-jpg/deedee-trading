export type PriceResolution = 'day' | 'week' | 'month';

export interface RSISignal {
  symbol: string;
  rsi: number;
  status: 'oversold' | 'neutral' | 'overbought';
  timestamp: Date;
  provider: 'alphaVantage' | 'polygon';
}

export interface MarketMoverStock {
  symbol: string;
  lastPrice: number;
  changePercent: number;
  change: number;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
}

export interface MarketMoversResponse {
  topGainers: MarketMoverStock[];
  topLosers: MarketMoverStock[];
  timestamp: Date;
}

// Alpha Vantage Market Movers Types
export interface AlphaVantageStock {
  ticker: string;
  price: string;
  change_amount: string;
  change_percentage: string;
  volume: string;
  market?: string;
  region?: string;
  exchange?: string;
  is_etf?: string;
  is_actively_trading?: string;
}

export interface AlphaVantageMarketMoversResponse {
  metadata: string;
  last_updated: string;
  top_gainers: AlphaVantageStock[];
  top_losers: AlphaVantageStock[];
  most_actively_traded: AlphaVantageStock[];
}

export interface PolygonRsiValue {
  timestamp: number;
  value: number;
}

export interface PolygonRsiResponse {
  status: 'OK' | 'ERROR';
  request_id: string;
  results?: {
    values?: PolygonRsiValue[];
  };
  error?: string;
}

export type AlphaVantageMoverCategory =
  | 'top_gainers'
  | 'top_losers'
  | 'most_actively_traded';

export interface USMarketRsiMetadata {
  limitPerCategory: number;
  totalRequested: number;
  providerPreference: 'polygon' | 'alphaVantage' | 'auto';
  categories: Record<AlphaVantageMoverCategory, string[]>;
  skippedTickers: Record<AlphaVantageMoverCategory, string[]>;
}

export interface USMarketRsiResponse {
  timestamp: Date;
  symbols: RSISignal[];
  failedSymbols: string[];
  metadata: USMarketRsiMetadata;
}

export interface SupportBreakLoser {
  symbol: string;
  companyName?: string | null;
  lastPrice: number;
  changePercent: number;
  change: number;
  volume?: number | null;
  supportLevel?: number | null;
  supportLevelSecondary?: number | null;
  resistance1?: number | null;
  resistance2?: number | null;
  belowSupportPercent?: number | null;
  distanceToSupportPercent?: number | null;
}

export interface SupportBreakLosersMetadata {
  limitRequested: number;
  inspected: number;
  produced: number;
  tolerancePercent: number;
  minDropPercent: number;
  resolution: PriceResolution;
  skippedSymbols: Array<{ symbol: string; reason: string }>;
}

export interface SupportBreakLosersResponse {
  timestamp: Date;
  stocks: SupportBreakLoser[];
  metadata: SupportBreakLosersMetadata;
}

export type StockPriceHistoryRange = '1M' | '3M' | '6M' | 'YTD' | '1Y';

export interface StockPricePoint {
  timestamp: number;
  date: string;
  close: number;
  volume?: number | null;
}

export interface SupportLevelsSnapshot {
  supportLevel?: number | null;
  supportLevelSecondary?: number | null;
  resistance1?: number | null;
  resistance2?: number | null;
  belowSupportPercent?: number | null;
  distanceToSupportPercent?: number | null;
}

export interface StockOverviewPrice {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketCap?: string | null;
  volume?: string | null;
  provider?: string | null;
  timestamp?: Date | null;
}

export interface StockOverviewResponse {
  symbol: string;
  companyName?: string | null;
  country?: string | null;
  price?: StockOverviewPrice | null;
  rsi?: RSISignal | null;
  support?: SupportLevelsSnapshot | null;
  metadata: {
    supportResolution: PriceResolution;
    supportProvider: 'polygon' | 'alphaVantage' | null;
    includeRsi: boolean;
    timestamp: Date;
    message?: string;
  };
}

export interface StockPriceHistoryResponse {
  symbol: string;
  companyName?: string | null;
  range: StockPriceHistoryRange;
  resolution: PriceResolution;
  provider: 'polygon' | 'alphaVantage' | null;
  points: StockPricePoint[];
  support?: SupportLevelsSnapshot | null;
  metadata: {
    from: number;
    to: number;
    count: number;
    disabled?: boolean;
    message?: string;
  };
}

export type StockPerformanceTimeframe =
  | '1D'
  | '1W'
  | '1M'
  | '3M'
  | '6M'
  | 'YTD'
  | '1Y';

export interface StockPerformanceEntry {
  timeframe: StockPerformanceTimeframe;
  changePercent: number | null;
  startPrice: number | null;
  endPrice: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface StockPerformanceResponse {
  symbol: string;
  companyName?: string | null;
  entries: StockPerformanceEntry[];
  latestClose?: number | null;
  metadata: {
    provider: 'polygon' | 'alphaVantage' | null;
    from: number;
    to: number;
    count: number;
    disabled?: boolean;
    message?: string;
  };
}

export interface StockRevenueEntry {
  period: string;
  fiscalDateEnding?: string;
  calendarYear?: string;
  revenue: number | null;
  yoyChangePercent: number | null;
  currency?: string | null;
}

export interface StockRevenueResponse {
  symbol: string;
  companyName?: string | null;
  series: StockRevenueEntry[];
  metadata: {
    provider: 'fmp';
    limit: number;
    hasApiKey: boolean;
    fetchedAt: Date;
    message?: string;
  };
}

export interface StockNewsItem {
  headline: string;
  source?: string | null;
  url?: string | null;
  summary?: string | null;
  publishedAt?: string | null;
  imageUrl?: string | null;
}

export interface StockNewsResponse {
  symbol: string;
  items: StockNewsItem[];
  metadata: {
    provider: 'fmp' | 'polygon';
    limit: number;
    hasApiKey: boolean;
    fetchedAt: Date;
    message?: string;
  };
}
