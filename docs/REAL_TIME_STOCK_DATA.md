# Real-Time Stock Data Integration Guide

This guide explains how to integrate real-time U.S. stock data from Interactive Brokers and other data providers into your NestJS trading backend.

## Table of Contents
1. [Enhanced Stock Entity](#enhanced-stock-entity)
2. [Interactive Brokers Setup](#interactive-brokers-setup)
3. [Real-Time Data Architecture](#real-time-data-architecture)
4. [WebSocket Implementation](#websocket-implementation)
5. [Data Storage Strategy](#data-storage-strategy)
6. [Performance Optimization](#performance-optimization)
7. [Alternative Data Providers](#alternative-data-providers)

## Enhanced Stock Entity

The enhanced `Stock` entity now includes comprehensive fields for U.S. stock data:

### Key Improvements:
- **IBKR Integration**: Added `ibkr_contract_id` for Interactive Brokers contract mapping
- **Real-Time Pricing**: Bid/Ask spreads, volume, price changes, market status
- **Company Information**: Industry, sector, market cap, fundamentals
- **Trading Data**: Min tick size, tradable status, market hours
- **Data Quality**: Source tracking, delay information, timestamps
- **Performance**: Strategic database indexes for fast queries

### Database Migration

Generate and run the migration for the enhanced entity:

```bash
npm run typeorm:generate -- --name=enhance-stock-entity
npm run typeorm:run
```

## Interactive Brokers Setup

### Prerequisites

1. **Interactive Brokers Account**: You need an active IBKR account
2. **TWS or IB Gateway**: Download and install TWS (Trader Workstation) or IB Gateway
3. **API Permissions**: Enable API access in your IBKR account settings

### Installation

```bash
# Install IBKR Node.js API wrapper (choose one)
npm install @stoqey/ib-sdk
# OR
npm install ib-api

# Install required dependencies for real-time features
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install @nestjs/schedule
```

### Configuration

Add IBKR configuration to your `.env` file:

```env
# Interactive Brokers Configuration
IBKR_HOST=127.0.0.1
IBKR_PORT=7497  # Paper trading: 7497, Live: 7496
IBKR_CLIENT_ID=1
IBKR_TIMEOUT=30000

# Market Data Configuration
ENABLE_REAL_TIME_DATA=true
DATA_CACHE_TTL=300000  # 5 minutes
PRICE_UPDATE_INTERVAL=1000  # 1 second
```

### TWS/IB Gateway Setup

1. **Start TWS or IB Gateway**
2. **Configure API Settings**:
   - Go to Edit → Global Configuration → API → Settings
   - Enable "Enable ActiveX and Socket Clients"
   - Add your server IP to "Trusted IPs"
   - Set Socket port to 7497 (paper) or 7496 (live)

## Real-Time Data Architecture

### Core Components

1. **IBKRMarketDataService**: Manages IBKR API connections and data subscriptions
2. **RealTimePriceService**: Handles price updates, caching, and database persistence
3. **StockPricesGateway**: WebSocket gateway for broadcasting updates to clients
4. **Enhanced Stock Entity**: Comprehensive data model for U.S. stocks

### Data Flow

```
IBKR API → IBKRMarketDataService → RealTimePriceService → Database + Cache
                                                       ↓
WebSocket Clients ← StockPricesGateway ←─────────────────
```

## WebSocket Implementation

### Client Connection Example

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3000/stocks', {
  transports: ['websocket']
});

// Subscribe to stock updates
socket.emit('subscribe', { symbols: ['AAPL', 'GOOGL', 'MSFT'] });

// Listen for price updates
socket.on('priceUpdate', (data) => {
  console.log('Price Update:', data);
  // {
  //   symbol: 'AAPL',
  //   price: 175.23,
  //   change: 2.15,
  //   changePercent: 1.24,
  //   volume: 45623100,
  //   timestamp: '2025-09-24T15:30:00.000Z'
  // }
});

// Unsubscribe from specific symbols
socket.emit('unsubscribe', { symbols: ['GOOGL'] });
```

### Frontend React Hook Example

```typescript
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

export const useStockPrices = (symbols: string[]) => {
  const [prices, setPrices] = useState<Map<string, StockPrice>>(new Map());
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io('ws://localhost:3000/stocks');
    setSocket(newSocket);

    newSocket.on('priceUpdate', (update: StockPrice) => {
      setPrices(prev => new Map(prev.set(update.symbol, update)));
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket && symbols.length > 0) {
      socket.emit('subscribe', { symbols });
    }
  }, [socket, symbols]);

  return prices;
};
```

## Data Storage Strategy

### Database Optimization

```sql
-- Indexes for fast price queries
CREATE INDEX idx_stocks_symbol ON stocks(symbol);
CREATE INDEX idx_stocks_last_price_update ON stocks(last_price_update);
CREATE UNIQUE INDEX idx_stocks_ibkr_contract ON stocks(ibkr_contract_id);

-- Partition large tables by date (for price history)
CREATE TABLE stock_price_history (
  id UUID PRIMARY KEY,
  stock_id UUID REFERENCES stocks(id),
  price DECIMAL(10,4),
  volume BIGINT,
  timestamp TIMESTAMP,
  -- Partition by month
) PARTITION BY RANGE (timestamp);
```

### Caching Strategy

```typescript
// Redis configuration for price caching
export class PriceCacheService {
  async setPrice(symbol: string, price: StockPrice): Promise<void> {
    await this.redis.setex(
      `price:${symbol}`, 
      300, // 5 minute TTL
      JSON.stringify(price)
    );
  }

  async getPrice(symbol: string): Promise<StockPrice | null> {
    const cached = await this.redis.get(`price:${symbol}`);
    return cached ? JSON.parse(cached) : null;
  }
}
```

## Performance Optimization

### 1. Batch Updates

```typescript
// Update multiple stocks in a single database transaction
async updateStocksBatch(updates: StockUpdate[]): Promise<void> {
  await this.stockRepository.manager.transaction(async manager => {
    const promises = updates.map(update => 
      manager.update(Stock, { symbol: update.symbol }, update.data)
    );
    await Promise.all(promises);
  });
}
```

### 2. Connection Pooling

```typescript
// Configure TypeORM for high-performance
@Module({
  imports: [
    TypeOrmModule.forRoot({
      // ... other config
      extra: {
        connectionLimit: 20,
        acquireTimeout: 30000,
        timeout: 30000,
      }
    })
  ]
})
```

### 3. Memory Management

```typescript
// Implement LRU cache for price data
import LRU from 'lru-cache';

const priceCache = new LRU<string, StockPrice>({
  max: 10000, // Cache up to 10,000 stocks
  maxAge: 5 * 60 * 1000, // 5 minutes
});
```

## Alternative Data Providers

### 1. Alpha Vantage

```bash
npm install alphavantage
```

```typescript
const alpha = require('alphavantage')({ key: 'YOUR_API_KEY' });

// Real-time quote
const quote = await alpha.data.quote('AAPL');
```

### 2. IEX Cloud

```bash
npm install iex-api
```

```typescript
import { IEXCloudClient } from 'iex-api';

const client = new IEXCloudClient(apiToken);
const quote = await client.quote('AAPL');
```

### 3. Polygon.io

```bash
npm install @polygon.io/client-js
```

```typescript
import { restClient } from '@polygon.io/client-js';

const rest = restClient('YOUR_API_KEY');
const quote = await rest.stocks.quote('AAPL');
```

### 4. WebSocket Streams

```typescript
// Polygon.io WebSocket example
const WebSocket = require('ws');

const ws = new WebSocket('wss://socket.polygon.io/stocks');

ws.on('open', () => {
  ws.send(JSON.stringify({
    action: 'auth',
    params: 'YOUR_API_KEY'
  }));
  
  ws.send(JSON.stringify({
    action: 'subscribe',
    params: 'T.AAPL,T.GOOGL'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  // Process real-time trade data
});
```

## Testing the Implementation

### 1. Start the Services

```bash
# Start your NestJS application
npm run start:dev

# The IBKR service should automatically connect and start simulating data
```

### 2. Test WebSocket Connection

```bash
# Install wscat for testing
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:3000/stocks

# Send subscription
{"event": "subscribe", "data": {"symbols": ["AAPL", "GOOGL"]}}
```

### 3. API Testing

```bash
# Get stock data
curl http://localhost:3000/stocks

# Get real-time price
curl http://localhost:3000/stocks/AAPL/price
```

## Monitoring and Alerts

### 1. Health Checks

```typescript
@Injectable()
export class MarketDataHealthCheck {
  @HealthCheck()
  async check(): Promise<HealthIndicatorResult> {
    const isHealthy = this.ibkrService.isConnected();
    return this.health.check('ibkr', () => ({
      status: isHealthy ? 'up' : 'down'
    }));
  }
}
```

### 2. Logging

```typescript
// Structured logging for market data
this.logger.log('Market data update', {
  symbol,
  price,
  volume,
  timestamp: new Date().toISOString(),
  source: 'IBKR'
});
```

## Security Considerations

1. **API Key Management**: Store IBKR credentials securely using environment variables
2. **Rate Limiting**: Implement rate limiting for WebSocket connections
3. **Authentication**: Secure WebSocket connections with JWT authentication
4. **Data Validation**: Validate all incoming market data before processing

## Troubleshooting

### Common Issues

1. **IBKR Connection Fails**:
   - Verify TWS/IB Gateway is running
   - Check API settings and trusted IPs
   - Ensure correct port (7497 for paper, 7496 for live)

2. **WebSocket Not Connecting**:
   - Check CORS configuration
   - Verify Socket.IO versions match
   - Check firewall settings

3. **High Memory Usage**:
   - Implement proper cache eviction
   - Limit number of subscribed symbols
   - Monitor memory usage with APM tools

This implementation provides a robust foundation for real-time stock data integration with Interactive Brokers and other providers.