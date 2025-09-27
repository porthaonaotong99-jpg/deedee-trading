// IBKR Contract interface
export interface IBKRContract {
  conId: number;
  symbol: string;
  secType: 'STK' | 'OPT' | 'FUT' | 'CASH';
  exchange: string;
  currency: string;
  localSymbol?: string;
  primaryExch?: string;
}

// IBKR Tick Data interface
export interface IBKRTickData {
  contractId: number;
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  bidSize: number;
  askSize: number;
  lastSize: number;
  high: number;
  low: number;
  volume: number;
  close: number;
  timestamp: Date;
}

// Market Order Response interface
export interface MarketOrderResponse {
  orderId: number;
  status: 'Submitted' | 'Filled' | 'Cancelled' | 'Rejected';
}

// Historical Data Point interface
export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// IBKR Connection Status
export interface IBKRConnectionStatus {
  isConnected: boolean;
  lastConnected?: Date;
  subscribedContracts: number;
}
