// Type definitions for @stoqey/ib library
// This file provides proper TypeScript interfaces for type safety

export interface IBContract {
  symbol: string;
  secType: 'STK' | 'OPT' | 'FUT' | 'CASH' | 'BOND' | 'CFD' | 'FUND';
  exchange: string;
  currency: string;
  localSymbol?: string;
  primaryExch?: string;
  conId?: number;
}

export interface IBOrderRequest {
  orderType: 'MKT' | 'LMT' | 'STP' | 'STP LMT';
  action: 'BUY' | 'SELL';
  totalQuantity: number;
  lmtPrice?: number;
  auxPrice?: number;
  tif?: 'DAY' | 'GTC' | 'IOC' | 'FOK';
}

export interface IBTickPriceEvent {
  reqId: number;
  field: number;
  price: number;
  canAutoExecute: boolean;
}

export interface IBTickSizeEvent {
  reqId: number;
  field: number;
  size: number;
}

export interface IBOrderStatusEvent {
  orderId: number;
  status: string;
  filled: number;
  remaining: number;
  avgFillPrice: number;
  permId: number;
  parentId: number;
  lastFillPrice: number;
  clientId: number;
  whyHeld: string;
}

export interface IBErrorEvent {
  id: number;
  errorCode: number;
  errorString: string;
}

export interface IBNextValidIdEvent {
  orderId: number;
}

export interface IBPositionEvent {
  account: string;
  contract: IBContract;
  position: number;
  avgCost: number;
}

export interface IBAccountSummaryEvent {
  reqId: number;
  account: string;
  tag: string;
  value: string;
  currency: string;
}

// Market data field constants
export enum MarketDataField {
  BID_SIZE = 0,
  BID = 1,
  ASK = 2,
  ASK_SIZE = 3,
  LAST = 4,
  LAST_SIZE = 5,
  HIGH = 6,
  LOW = 7,
  VOLUME = 8,
  CLOSE = 9,
}

// Order status constants
export enum IBOrderStatusType {
  PendingSubmit = 'PendingSubmit',
  PendingCancel = 'PendingCancel',
  PreSubmitted = 'PreSubmitted',
  Submitted = 'Submitted',
  Cancelled = 'Cancelled',
  Filled = 'Filled',
  Inactive = 'Inactive',
}
