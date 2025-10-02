# Interactive Brokers Integration Guide

## Overview
This guide will help you integrate your NestJS application with Interactive Brokers (IBKR) for real-time market data and trading functionality.

## ✅ What We've Implemented

### 1. **Service Layer** (`interactive-brokers.service.ts`)
- Real IBKR API integration using `@stoqey/ib` library
- Connection management with auto-reconnection
- Market data retrieval
- Order placement and management
- Position and account information retrieval

### 2. **Controller Layer** (`interactive-brokers.controller.ts`)
- REST API endpoints for market data
- Order placement endpoint
- Connection status checking
- Position and order status queries

### 3. **Configuration**
- Environment variables for IBKR connection settings
- TypeScript interfaces for type safety

## 🚀 Quick Start Guide

### Step 1: Set Up Your Interactive Brokers Account

1. **Create IBKR Account**
   - Go to [Interactive Brokers](https://www.interactivebrokers.com)
   - Sign up and complete account verification
   - Enable paper trading for development

2. **Download TWS or IB Gateway**
   - **TWS (Recommended for beginners)**: Full GUI application
   - **IB Gateway (Recommended for servers)**: Lightweight, no GUI

3. **Configure API Settings in TWS/Gateway**
   ```
   Configure → API → Settings:
   ✅ Enable ActiveX and Socket Clients
   ✅ Socket Port: 7497 (paper) / 7496 (live)
   ✅ Add 127.0.0.1 to Trusted IPs
   ✅ Read-Only API: False (to place orders)
   ```

### Step 2: Update Environment Variables

Update your `.env` file with your IBKR settings:

```env
# Interactive Brokers Configuration
IB_HOST=localhost
IB_PORT=7497                    # 7497 for paper trading, 7496 for live
IB_CLIENT_ID=1                  # Unique client ID
IB_ACCOUNT_ID=DU1234567        # Your paper trading account ID
```

### Step 3: Start TWS/Gateway and Your Application

1. **Start TWS or IB Gateway**
   - Log in with your credentials
   - Ensure API settings are configured
   - Keep it running

2. **Start Your NestJS Application**
   ```bash
   npm run start:dev
   ```

3. **Check Connection Status**
   ```bash
   curl http://localhost:3000/interactive-brokers/connection-status
   ```

## 📡 API Endpoints

### Get Market Data
```http
GET /interactive-brokers/market-data/AAPL
```

### Check Connection Status
```http
GET /interactive-brokers/connection-status
```

### Get Positions
```http
GET /interactive-brokers/positions?accountId=DU1234567
```

### Place Order
```http
POST /interactive-brokers/place-order
Content-Type: application/json

{
  "symbol": "AAPL",
  "action": "BUY",
  "orderType": "MKT",
  "totalQuantity": 100
}
```

### Get Order Status
```http
GET /interactive-brokers/orders?orderId=123
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `IB_HOST` | IBKR host address | localhost | localhost |
| `IB_PORT` | IBKR socket port | 7497 | 7497 (paper), 7496 (live) |
| `IB_CLIENT_ID` | Unique client identifier | 1 | 1, 2, 3... |
| `IB_ACCOUNT_ID` | Your IBKR account ID | DU1234567 | DU1234567 |

### Port Configuration
- **Paper Trading**: Port 7497
- **Live Trading**: Port 7496
- **Multiple Clients**: Use different client IDs (1, 2, 3, etc.)

## 🛠 Troubleshooting

### Common Issues

1. **Connection Refused**
   - ✅ Ensure TWS/Gateway is running
   - ✅ Check API settings are enabled
   - ✅ Verify port number (7497 for paper, 7496 for live)
   - ✅ Add 127.0.0.1 to trusted IPs

2. **Authentication Errors**
   - ✅ Check your credentials
   - ✅ Ensure account is approved and funded
   - ✅ Verify paper trading is enabled

3. **Permission Denied**
   - ✅ Set "Read-Only API" to False
   - ✅ Check account permissions
   - ✅ Verify market data subscriptions

4. **Type Errors in Code**
   - The current implementation uses `as any` type casting to bypass strict TypeScript types
   - This is temporary and can be fixed with proper type definitions

### Debug Steps

1. **Check Connection**
   ```bash
   curl http://localhost:3000/interactive-brokers/connection-status
   ```

2. **Monitor Logs**
   - Watch your application logs for connection events
   - Check TWS/Gateway logs for API activity

3. **Test Market Data**
   ```bash
   curl http://localhost:3000/interactive-brokers/market-data/AAPL
   ```

## 🔄 Development Workflow

### 1. Development with Paper Trading
- Use paper trading account (DU prefix)
- Port 7497
- Safe to test orders without real money

### 2. Production with Live Trading
- Use live account
- Port 7496
- Requires real funding and careful testing

### 3. Multiple Environments
- Use different client IDs for each environment
- Separate configuration files
- Different account IDs for paper vs live

## 📊 Market Data Types

The service supports various market data:
- **Real-time quotes**: Bid, Ask, Last price
- **Volume data**: Current volume
- **OHLC data**: Open, High, Low, Close
- **Multiple symbols**: Any IBKR supported instrument

## 💼 Order Types Supported

- **Market Orders (MKT)**: Execute at current market price
- **Limit Orders (LMT)**: Execute at specified price or better
- **Stop Orders (STP)**: Trigger when price reaches stop level
- **Stop-Limit Orders (STP LMT)**: Combination of stop and limit

## 🔐 Security Considerations

1. **Environment Variables**: Never commit real credentials
2. **Network Security**: Use firewalls and VPNs for production
3. **API Keys**: Rotate credentials regularly
4. **Access Control**: Limit API permissions as needed

## 📈 Next Steps

1. **Add More Endpoints**: Historical data, options, futures
2. **Implement WebSocket**: Real-time streaming data
3. **Add Order Management**: Modify, cancel orders
4. **Portfolio Analytics**: P&L, risk metrics
5. **Fix Type Safety**: Remove `as any` casting with proper types

## 🆘 Getting Help

1. **IBKR API Documentation**: [Official TWS API Guide](https://interactivebrokers.github.io/tws-api/)
2. **Library Documentation**: [@stoqey/ib on NPM](https://www.npmjs.com/package/@stoqey/ib)
3. **IBKR Support**: Contact Interactive Brokers support for account issues

---

**Important**: Always test with paper trading before using live accounts!