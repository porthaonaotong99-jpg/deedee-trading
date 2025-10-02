export interface PlaceOrderResponseDto {
  success: boolean;
  orderId: number | null;
  message: string;
}

export interface ConnectionStatusResponseDto {
  isConnected: boolean;
  connectionInfo: {
    host: string;
    port: number;
    clientId: number;
    isConnected: boolean;
  };
}

export interface MarketDataResponseDto {
  symbol: string;
  bid?: number;
  ask?: number;
  last?: number;
  volume?: number;
  high?: number;
  low?: number;
  close?: number;
  timestamp: Date;
}

export interface OrderStatusResponseDto {
  message?: string;
  orderId?: number;
  status?: string;
  filled?: number;
  remaining?: number;
  avgFillPrice?: number;
  lastFillPrice?: number;
  whyHeld?: string;
}
