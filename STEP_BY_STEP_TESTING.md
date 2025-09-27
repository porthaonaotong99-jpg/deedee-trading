# 🧪 Step-by-Step US Stock Real-Time System Testing Guide

## 📋 Pre-Testing Checklist

Before starting, ensure you have:
- ✅ PostgreSQL database running
- ✅ Node.js application built successfully
- ✅ Port 3000 available for the server
- ✅ A modern web browser for WebSocket testing

---

## 🚀 **STEP 1: Start Your Application**

Open terminal and start your NestJS application:

```bash
cd "/Users/porthao/Desktop/Owner project/trading/deedee-trading-backend"
npm run start:dev
```

**Expected Output:**
```
[Nest] 12345  - MM/DD/YYYY, HH:MM:SS AM     LOG [NestApplication] Nest application successfully started +XXXms
[Nest] 12345  - MM/DD/YYYY, HH:MM:SS AM     LOG [IBKRMarketDataService] Connected to IBKR TWS API (simulated)
```

**✅ Success Indicators:**
- No error messages in terminal
- Application starts on `http://localhost:3000`
- WebSocket server initializes
- IBKR service connects (simulated)

---

## 🔧 **STEP 2: Test API Health Check**

Open a new terminal and test the health endpoint:

```bash
curl -X GET http://localhost:3000/api/v1/demo/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-24T...",
  "components": {
    "demoService": "active",
    "realTimePriceService": "active",
    "webSocketGateway": "active"
  },
  "cache": {
    "size": 0,
    "symbols": []
  },
  "subscriptions": {
    "count": 0,
    "symbols": []
  }
}
```

**✅ What This Tests:**
- All services are properly loaded
- WebSocket gateway is active
- API endpoints are working
- Cache system is initialized

---

## 📊 **STEP 3: Initialize US Stock Data**

Start the demo system with popular US stocks:

```bash
curl -X POST http://localhost:3000/api/v1/demo/start
```

**Expected Response:**
```json
{
  "message": "Real-time stock data demo started",
  "subscribedSymbols": ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "NVDA"],
  "status": "running",
  "cacheSize": 6,
  "lastUpdate": "2025-09-24T..."
}
```

**✅ What This Tests:**
- Demo service can subscribe to multiple US stocks
- Cache is populated with stock symbols
- Market data simulation begins
- Real-time price generation starts

---

## 📈 **STEP 4: Verify US Stock Price Data**

Wait 3-5 seconds for price generation, then check current prices:

```bash
curl -X GET http://localhost:3000/api/v1/demo/prices
```

**Expected Response:**
```json
[
  {
    "symbol": "AAPL",
    "price": 175.23,
    "change": 2.45,
    "changePercent": 1.42,
    "volume": 45623789
  },
  {
    "symbol": "GOOGL",
    "price": 2847.50,
    "change": -15.30,
    "changePercent": -0.53,
    "volume": 1234567
  }
  // ... more stocks
]
```

**✅ What This Tests:**
- US stock prices are being generated
- Price changes and percentages calculate correctly
- Volume data is realistic
- All subscribed stocks have data

---

## 🔍 **STEP 5: Test Individual US Stock Lookup**

Get specific stock data:

```bash
# Test Apple (AAPL)
curl -X GET http://localhost:3000/demo/price/AAPL

# Test Google (GOOGL)
curl -X GET http://localhost:3000/demo/price/GOOGL

# Test Tesla (TSLA)  
curl -X GET http://localhost:3000/demo/price/TSLA
```

**Expected Response for AAPL:**
```json
{
  "symbol": "AAPL",
  "price": 175.23,
  "change": 2.45,
  "changePercent": 1.42,
  "volume": 45623789,
  "bidPrice": 175.22,
  "askPrice": 175.24,
  "bidSize": 500,
  "askSize": 300,
  "high": 177.89,
  "low": 173.45,
  "open": 174.50,
  "previousClose": 172.78
}
```

**✅ What This Tests:**
- Individual stock data retrieval
- Complete market data (bid/ask, high/low, volume)
- Proper US stock symbol recognition
- Real-time data accuracy

---

## 📊 **STEP 6: Test New US Stock Subscription**

Subscribe to additional US stocks:

```bash
# Subscribe to Netflix
curl -X POST http://localhost:3000/demo/subscribe/NFLX

# Subscribe to Microsoft
curl -X POST http://localhost:3000/demo/subscribe/MSFT

# Subscribe to Meta (Facebook)
curl -X POST http://localhost:3000/demo/subscribe/META

# Subscribe to AMD
curl -X POST http://localhost:3000/demo/subscribe/AMD
```

**Expected Response:**
```json
{
  "message": "Successfully subscribed to NFLX",
  "symbol": "NFLX",
  "status": "subscribed"
}
```

**Then verify the new stock data:**
```bash
curl -X GET http://localhost:3000/demo/price/NFLX
```

**✅ What This Tests:**
- Dynamic subscription to new US stocks
- Symbol validation and normalization
- Immediate price data generation
- Cache expansion

---

## ⚡ **STEP 7: Test Real-Time Price Updates**

Test manual price simulation:

```bash
# Trigger price updates for different stocks
curl -X POST http://localhost:3000/demo/simulate/AAPL
curl -X POST http://localhost:3000/demo/simulate/GOOGL
curl -X POST http://localhost:3000/demo/simulate/TSLA
```

**Then immediately check for price changes:**
```bash
curl -X GET http://localhost:3000/demo/prices
```

**✅ What This Tests:**
- Manual price update triggers
- Price volatility simulation  
- Real-time price changes
- Market data refreshes

---

## 🌐 **STEP 8: Test WebSocket Real-Time Updates**

### Option A: Use the HTML Test Client

1. **Open test client:**
   ```bash
   open test-client.html
   ```
   (Or open `test-client.html` in your browser)

2. **Connect WebSocket:**
   - Click "Connect" button
   - Should show "Connected to WebSocket"

3. **Subscribe to stocks:**
   - Enter "AAPL" in the symbol field
   - Click "Subscribe to Symbol"
   - Repeat for "GOOGL", "TSLA", "MSFT"

4. **Watch live updates:**
   - Price cards should appear and update every 2-5 seconds
   - Check activity logs for real-time events
   - Prices should change realistically

### Option B: Browser Console Testing

Open browser console and run:

```javascript
// Connect to WebSocket
const socket = io('http://localhost:3000');

// Track connection
socket.on('connect', () => {
    console.log('✅ Connected to WebSocket');
    
    // Subscribe to US stocks
    socket.emit('subscribe', 'AAPL');
    socket.emit('subscribe', 'GOOGL');
    socket.emit('subscribe', 'TSLA');
    socket.emit('subscribe', 'MSFT');
});

// Listen for real-time updates
socket.on('priceUpdate', (data) => {
    console.log('📈 Real-time update:', {
        symbol: data.symbol,
        price: data.price,
        change: data.changePercent + '%',
        volume: data.volume.toLocaleString()
    });
});

socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected');
});
```

**✅ What This Tests:**
- WebSocket connection stability
- Real-time price broadcasting
- Multiple client subscriptions
- Live data streaming

---

## 📊 **STEP 9: Test Cache Performance**

Check system statistics:

```bash
curl -X GET http://localhost:3000/demo/stats
```

**Expected Response:**
```json
{
  "size": 10,
  "subscriptions": 10,
  "symbols": ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "NVDA", "NFLX", "META", "AMD", ...]
}
```

**✅ What This Tests:**
- Cache size corresponds to subscribed stocks
- Memory usage is reasonable
- All US stocks are tracked
- Performance metrics

---

## 🧪 **STEP 10: Load Testing**

Test with multiple concurrent requests:

```bash
# Test rapid API calls
for i in {1..20}; do
  curl -X GET http://localhost:3000/demo/prices &
done
wait

# Test multiple price simulations
for stock in AAPL GOOGL MSFT TSLA AMZN NVDA; do
  curl -X POST http://localhost:3000/demo/simulate/$stock &
done
wait
```

**✅ What This Tests:**
- API performance under load
- Cache handling concurrent requests
- Memory stability
- Response time consistency

---

## ✅ **STEP 11: Validation Checklist**

Mark each item as you verify:

### **API Testing:**
- [ ] Health check returns "healthy" status
- [ ] Demo start subscribes to 6 US stocks
- [ ] Price endpoint returns realistic stock data
- [ ] Individual stock lookup works for AAPL, GOOGL, TSLA
- [ ] New stock subscription (NFLX, META, AMD) works
- [ ] Price simulation triggers updates

### **WebSocket Testing:**
- [ ] WebSocket connection establishes successfully
- [ ] Real-time price updates received every 2-5 seconds
- [ ] Multiple stocks update simultaneously
- [ ] Price changes are realistic (±5% typical volatility)
- [ ] No connection drops or errors

### **US Stock Data Validation:**
- [ ] Stock symbols are properly formatted (uppercase)
- [ ] Price ranges are realistic ($10-$500 typical)
- [ ] Volume numbers are appropriate (1M-100M shares)
- [ ] Bid/ask spreads are reasonable ($0.01-$0.10)
- [ ] High/low prices make sense relative to current price

### **System Performance:**
- [ ] API responses under 100ms
- [ ] Memory usage stable during extended testing
- [ ] No error messages in console
- [ ] Database connections stable
- [ ] Cache size matches subscribed stocks

---

## 🐛 **Common Issues & Solutions**

### **Issue 1: No Price Updates**
```bash
# Check if demo is started
curl -X GET http://localhost:3000/demo/stats
# If size is 0, run:
curl -X POST http://localhost:3000/demo/start
```

### **Issue 2: WebSocket Won't Connect**
- Check CORS settings in `main.ts`
- Verify Socket.IO client version matches server
- Check browser console for errors

### **Issue 3: Unrealistic Stock Prices**
- This is expected in simulation mode
- Prices will be more realistic with real IBKR integration

### **Issue 4: High Memory Usage**
```bash
# Check cache stats
curl -X GET http://localhost:3000/demo/stats
# If too large, restart application
```

---

## 🎯 **Expected Test Results Summary**

After completing all steps, you should have:

✅ **6+ US stocks** with real-time data  
✅ **WebSocket connections** streaming live updates  
✅ **API endpoints** responding quickly  
✅ **Cache system** managing 10+ stocks efficiently  
✅ **Price simulation** working for all major US stocks  
✅ **No errors** in console or logs  

## 🚀 **Next Steps After Successful Testing**

1. **Production Setup**: Replace mock IBKR with real API
2. **Add Authentication**: Secure endpoints for production
3. **Add More Stocks**: Expand to full NYSE/NASDAQ coverage  
4. **Performance Tuning**: Optimize for thousands of concurrent users
5. **Monitoring**: Add logging and metrics collection

Your US stock real-time system is now fully tested and ready for production! 🎉