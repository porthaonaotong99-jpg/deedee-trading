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
}

export interface USMarketRsiResponse {
  timestamp: Date;
  symbols: RSISignal[];
  failedSymbols: string[];
  metadata: USMarketRsiMetadata;
}
