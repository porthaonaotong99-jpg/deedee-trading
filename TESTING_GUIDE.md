# 🧪 Real-Time Stock Data System - Testing Guide

This guide explains how to test your real-time stock data system to ensure everything works correctly.

## 📋 Prerequisites

Before testing, ensure you have:

1. **Application Running**: Your NestJS application should be running
2. **Dependencies Installed**: All npm packages should be installed
3. **Database Connected**: PostgreSQL database should be accessible
4. **WebSocket Enabled**: Socket.IO should be configured

## 🚀 Step 1: Start the Application

```bash
# Development mode (recommended for testing)
npm run start:dev

# Or production mode
npm run start
```

Your application should start on `http://localhost:3000`

## 🌐 Step 2: Test API Endpoints

### Health Check
```bash
curl http://localhost:3000/demo/health
```
**Expected Response**: System health status with component information

### Start Demo System
```bash
curl -X POST http://localhost:3000/demo/start
```
**Expected Response**:
```json
{
  "message": "Real-time stock data demo started",
  "subscribedSymbols": ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "NVDA"],
  "status": "running",
  "cacheSize": 6,
  "lastUpdate": "2025-09-24T..."
}
```

### Get Current Prices
```bash
curl http://localhost:3000/demo/prices
```
**Expected Response**: Array of current stock prices with real-time data

### Subscribe to Specific Stock
```bash
curl -X POST http://localhost:3000/demo/subscribe/NFLX
```
**Expected Response**:
```json
{
  "message": "Successfully subscribed to NFLX",
  "symbol": "NFLX",
  "status": "subscribed"
}
```

### Get Individual Stock Price
```bash
curl http://localhost:3000/demo/price/AAPL
```
**Expected Response**: Current price data for AAPL

### Trigger Manual Price Update
```bash
curl -X POST http://localhost:3000/demo/simulate/AAPL
```
**Expected Response**: Confirmation of price simulation

### Get Cache Statistics
```bash
curl http://localhost:3000/demo/stats
```
**Expected Response**: Cache size and subscribed symbols

## 📡 Step 3: Test WebSocket Real-Time Updates

### Option A: Use the HTML Test Client

1. **Open the test client**: Open `test-client.html` in your browser
2. **Connect WebSocket**: Click "Connect" button
3. **Start Demo**: Click "Start Demo" button
4. **Watch Live Updates**: You should see real-time price updates

### Option B: Manual WebSocket Testing

Using browser console or a WebSocket client:

```javascript
// Connect to WebSocket
const socket = io('http://localhost:3000');

// Listen for connection
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket');
  
  // Subscribe to a stock
  socket.emit('subscribe', 'AAPL');
});

// Listen for price updates
socket.on('priceUpdate', (data) => {
  console.log('📈 Price Update:', data);
});

// Handle disconnection
socket.on('disconnect', () => {
  console.log('❌ Disconnected from WebSocket');
});
```

## 🔍 Step 4: Verify System Components

### Check Logs
Monitor your application logs for:

- ✅ WebSocket connections
- ✅ Price update events
- ✅ Database operations
- ✅ Cache operations
- ❌ Any error messages

### Database Verification

Check if price data is being stored:

```sql
-- Check if stocks table has data
SELECT COUNT(*) FROM stocks;

-- Check recent price updates (if you have a price history table)
SELECT * FROM stock_prices ORDER BY created_at DESC LIMIT 10;
```

### Memory Cache Verification

Use the stats endpoint to verify cache is working:

```bash
curl http://localhost:3000/demo/stats
```

Expected output should show:
- Cache size > 0
- Subscribed symbols list
- Recent update timestamps

## 🧪 Step 5: Load Testing

### Test Multiple Concurrent Connections

1. **Open multiple browser tabs** with the test client
2. **Connect all tabs** to WebSocket
3. **Subscribe to different stocks** in each tab
4. **Verify updates** are received in all tabs

### Test API Performance

```bash
# Test multiple rapid API calls
for i in {1..10}; do
  curl http://localhost:3000/demo/prices &
done
wait
```

## 🐛 Step 6: Error Testing

### Test Invalid Scenarios

1. **Invalid Stock Symbol**:
   ```bash
   curl -X POST http://localhost:3000/demo/subscribe/INVALID123
   ```

2. **WebSocket Without Subscription**:
   - Connect to WebSocket but don't subscribe to any stocks
   - Verify no price updates are received

3. **Database Connection Loss**:
   - Temporarily stop your PostgreSQL database
   - Verify application handles errors gracefully

## ✅ Expected Test Results

### Successful Tests Should Show:

1. **API Endpoints**:
   - All endpoints return HTTP 200 status
   - JSON responses match expected format
   - No server errors in logs

2. **WebSocket Connection**:
   - Connection establishes successfully
   - Price updates are received in real-time
   - Multiple clients can connect simultaneously

3. **Data Flow**:
   - Prices change over time (simulation working)
   - Cache statistics update correctly
   - Database operations complete without errors

4. **Performance**:
   - Response times < 100ms for most API calls
   - WebSocket updates arrive within 1-2 seconds
   - No memory leaks during extended testing

## 🚨 Troubleshooting Common Issues

### 1. WebSocket Connection Fails
- Check if Socket.IO is properly configured in `main.ts`
- Verify CORS settings allow your domain
- Check browser console for JavaScript errors

### 2. No Price Updates
- Ensure demo system is started (`POST /demo/start`)
- Check if stocks are subscribed (`GET /demo/stats`)
- Verify WebSocket subscription (`socket.emit('subscribe', 'SYMBOL')`)

### 3. Database Errors
- Check PostgreSQL is running and accessible
- Verify database configuration in `.env`
- Run database migrations if needed

### 4. High CPU Usage
- This is normal during simulation mode
- Reduce simulation frequency in production
- Monitor for memory leaks in long-running tests

## 📊 Performance Benchmarks

### Expected Performance Targets:

- **API Response Time**: < 100ms
- **WebSocket Update Frequency**: 1-5 seconds per symbol
- **Concurrent Connections**: 100+ without performance degradation
- **Memory Usage**: Should remain stable during extended testing
- **Database Operations**: < 50ms for read operations

## 🔄 Automated Testing Script

Create a simple test script:

```bash
#!/bin/bash
echo "🧪 Starting automated tests..."

# Test API health
echo "Testing health endpoint..."
curl -s http://localhost:3000/demo/health | grep -q "healthy" && echo "✅ Health check passed" || echo "❌ Health check failed"

# Start demo
echo "Starting demo system..."
curl -s -X POST http://localhost:3000/demo/start | grep -q "started" && echo "✅ Demo started" || echo "❌ Demo start failed"

# Wait for initialization
sleep 3

# Test prices
echo "Testing price retrieval..."
PRICE_COUNT=$(curl -s http://localhost:3000/demo/prices | jq length)
if [ "$PRICE_COUNT" -gt 0 ]; then
  echo "✅ Prices retrieved: $PRICE_COUNT stocks"
else
  echo "❌ No prices found"
fi

# Test stats
echo "Testing statistics..."
curl -s http://localhost:3000/demo/stats | grep -q "symbols" && echo "✅ Stats working" || echo "❌ Stats failed"

echo "🎉 Automated tests completed!"
```

Save this as `test-system.sh` and run with `chmod +x test-system.sh && ./test-system.sh`

## 🎯 Next Steps After Testing

Once testing is complete and successful:

1. **Optimize Performance**: Based on test results, tune cache sizes and update frequencies
2. **Add Monitoring**: Implement logging and metrics collection
3. **Security Testing**: Add authentication and rate limiting
4. **Production Deployment**: Deploy to staging environment for further testing
5. **Integration Testing**: Test with real Interactive Brokers API (replace mock service)

---

## 📞 Support

If you encounter issues during testing:

1. Check application logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are properly installed
4. Review database connection and migrations
5. Test individual components in isolation

Happy testing! 🚀