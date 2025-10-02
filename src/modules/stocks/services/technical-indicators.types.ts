export interface RSISignal {
  symbol: string;
  rsi: number;
  status: 'oversold' | 'neutral' | 'overbought';
  timestamp: Date;
}

export interface TechnicalIndicatorComponent {
  name: string;
  value: number;
  signal: 'buy' | 'sell' | 'neutral';
}

export interface TechnicalSummary {
  symbol: string;
  overallRecommendation: 'buy' | 'sell' | 'neutral';
  indicators: TechnicalIndicatorComponent[];
  timestamp: Date;
}

export interface SupportResistanceLevel {
  level: number;
  type: 'support' | 'resistance';
}

export interface SupportResistanceAnalysis {
  symbol: string;
  currentPrice: number;
  nearestSupport: number | null;
  nearestResistance: number | null;
  supportDistance: number | null; // percentage
  resistanceDistance: number | null; // percentage
  levels: SupportResistanceLevel[];
  timestamp: Date;
}

export interface MarketMoverStock {
  symbol: string;
  lastPrice: number;
  changePercent: number;
  change: number;
  high: number;
  low: number;
  volume: number;
}

export interface MarketMoversResponse {
  topGainers: MarketMoverStock[];
  topLosers: MarketMoverStock[];
  timestamp: Date;
}

export interface TechnicalAnalysisSummary {
  symbol: string;
  rsi: string; // "75.2 (overbought)"
  summarySignal: 'buy' | 'sell' | 'neutral';
  nearestSupport: string; // "245.50 (-3.8%)"
  nearestResistance: string; // "265.80 (+4.1%)"
}

// Finnhub API Response Types
export interface FinnhubRsiResponse {
  s: 'ok' | 'no_data';
  rsi?: number[];
  t?: number[]; // timestamps
}

export interface FinnhubTechnicalAnalysisResponse {
  technicalAnalysis?: {
    adx?: { adx: number; signal: 'buy' | 'sell' | 'neutral' };
    rsi?: { rsi: number; signal: 'buy' | 'sell' | 'neutral' };
    macd?: { macd: number; signal: 'buy' | 'sell' | 'neutral' };
    sma?: { sma: number; signal: 'buy' | 'sell' | 'neutral' };
    ema?: { ema: number; signal: 'buy' | 'sell' | 'neutral' };
    signal?: 'buy' | 'sell' | 'neutral';
    count?: {
      buy: number;
      neutral: number;
      sell: number;
    };
  };
}

export interface FinnhubSupportResistanceResponse {
  levels?: number[];
}

export interface FinnhubQuoteResponse {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  h: number; // high price of the day
  l: number; // low price of the day
  o: number; // open price of the day
  pc: number; // previous close price
  t: number; // timestamp
  v?: number; // volume
}
