export interface IBStock {
  symbol: string;
  secType: 'STK' | 'OPT' | 'FUT' | 'CASH' | 'BOND' | 'CFD' | 'FUND';
  exchange: string;
  currency: string;
  localSymbol?: string;
}

export interface IBOrder {
  action: 'BUY' | 'SELL';
  orderType: 'MKT' | 'LMT' | 'STP' | 'STP LMT';
  totalQuantity: number;
  lmtPrice?: number;
  auxPrice?: number;
  tif?: 'DAY' | 'GTC' | 'IOC' | 'FOK';
}

export interface IBMarketData {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  high: number;
  low: number;
  close: number;
  timestamp: Date;
}

export interface IBPosition {
  account: string;
  contract: IBStock;
  position: number;
  marketPrice: number;
  marketValue: number;
  averageCost: number;
  unrealizedPNL: number;
  realizedPNL: number;
}

export interface IBAccount {
  accountId: string;
  netLiquidation: number;
  totalCashValue: number;
  settledCash: number;
  availableFunds: number;
  buyingPower: number;
  grossPositionValue: number;
  unrealizedPNL: number;
  realizedPNL: number;
}

export interface IBOrderStatus {
  orderId: number;
  status:
    | 'PendingSubmit'
    | 'Submitted'
    | 'Filled'
    | 'Cancelled'
    | 'PendingCancel'
    | 'Inactive';
  filled: number;
  remaining: number;
  avgFillPrice: number;
  lastFillPrice: number;
  whyHeld: string;
}

export interface IBConnection {
  host: string;
  port: number;
  clientId: number;
  isConnected: boolean;
}
