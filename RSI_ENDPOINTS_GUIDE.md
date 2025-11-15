# 📊 RSI Endpoints Guide - Get RSI for All US Stocks

## Overview

This guide covers **three different RSI endpoints** with different performance characteristics and use cases.

---

## 🚀 Available Endpoints

### 1️⃣ **Fast: RSI for Predefined Universe** (30 stocks)
```
GET /technical-indicators/rsi/all
```

**Speed**: ⚡ Very Fast (5-10 seconds)  
**Coverage**: Limited to 30 hardcoded stocks (AAPL, MSFT, GOOGL, etc.)  
**Best For**: Quick overview, demo purposes

**Response Example**:
```json
{
  "is_error": false,
  "code": "SUCCESS",
  "message": "RSI data for all stocks retrieved successfully",
  "data": [
    {
      "symbol": "AAPL",
      "rsi": 67.45,
      "status": "neutral",
      "timestamp": "2025-10-26T10:30:00.000Z"
    },
    {
      "symbol": "TSLA",
      "rsi": 28.12,
      "status": "oversold",
      "timestamp": "2025-10-26T10:30:00.000Z"
    }
    // ... 28 more stocks
  ],
  "error": null,
  "status_code": 200
}
```

---

### 2️⃣ **Comprehensive: RSI for ALL US Stocks**
```
GET /technical-indicators/rsi/all-us-stocks?limit=25
```

**Speed**: ⚡ Instant (depends on Google Apps Script response time)  
**Coverage**: Oversold (RSI ≤ 30) and overbought (RSI ≥ 70) US stocks sourced from a curated Google Sheet  
**Best For**: Quick view of market extremes without hammering provider APIs

**Query Parameters**:
- `limit` (optional, default: 25): Maximum symbols to return per RSI bucket (oversold & overbought)

**Behind the scenes**: The backend now consumes a Google Apps Script JSON feed (configurable via `US_MARKET_RSI_SOURCE_URL`). The feed is refreshed externally, so your API stays fast and predictable.

**Example Request**:
```bash
curl "http://localhost:3000/technical-indicators/rsi/all-us-stocks?limit=40"
```

**Response**:
```json
{
  "is_error": false,
  "code": "SUCCESS",
  "message": "US market RSI extremes retrieved successfully",
  "data": {
    "timestamp": "2025-10-26T10:30:00.000Z",
    "oversold": [
      {
        "symbol": "TSLA",
        "companyName": "Tesla Inc",
        "lastPrice": 198.25,
        "changePercent": -2.18,
        "rsi": 28.12,
        "status": "oversold",
        "group": "EV"
      }
    ],
    "overbought": [
      {
        "symbol": "META",
        "companyName": "Meta Platforms",
        "lastPrice": 347.9,
        "changePercent": 1.87,
        "rsi": 74.5,
        "status": "overbought",
        "group": "Tech Megacap"
      }
    ],
    "metadata": {
      "limitPerBucket": 40,
      "oversoldCount": 55,
      "overboughtCount": 22,
      "source": "google-script"
    }
  },
  "error": null,
  "status_code": 200
}
```

---

### 3️⃣ **Smart: Filtered RSI** (Best Option! 🌟)
```
GET /technical-indicators/rsi/filtered?filter=oversold&maxResults=50
```

**Speed**: ⚡⚡ Fast to Medium (30 seconds - 2 minutes)  
**Coverage**: Stops once it finds enough matching stocks  
**Best For**: Finding specific opportunities (oversold/overbought stocks)

**Query Parameters**:
- `filter` (optional, default: 'all'): 
  - `oversold` - RSI ≤ 30
  - `overbought` - RSI ≥ 70
  - `neutral` - RSI between 30-70
  - `all` - No filter
- `maxResults` (optional, default: 50): Stop after finding this many results

**✅ RECOMMENDED**: This is the **BEST** endpoint for most use cases!

**Example Requests**:
```bash
# Find 50 oversold stocks (potential buy opportunities)
curl "http://localhost:3000/technical-indicators/rsi/filtered?filter=oversold&maxResults=50"

# Find 30 overbought stocks (potential sell opportunities)
curl "http://localhost:3000/technical-indicators/rsi/filtered?filter=overbought&maxResults=30"

# Find all types (no filter)
curl "http://localhost:3000/technical-indicators/rsi/filtered?filter=all&maxResults=100"
```

**Response Example** (oversold stocks):
```json
{
  "is_error": false,
  "code": "SUCCESS",
  "message": "Found 50 oversold stocks",
  "data": [
    {
      "symbol": "TSLA",
      "rsi": 28.12,
      "status": "oversold",
      "timestamp": "2025-10-26T10:30:00.000Z"
    },
    {
      "symbol": "AMD",
      "rsi": 25.43,
      "status": "oversold",
      "timestamp": "2025-10-26T10:30:00.000Z"
    }
    // ... 48 more oversold stocks
  ],
  "error": null,
  "status_code": 200
}
```

---

## 📊 Comparison Table

| Endpoint | Speed | Coverage | Best For | Typical Duration |
|----------|-------|----------|----------|------------------|
| `/rsi/all` | ⚡⚡⚡ Very Fast | 30 stocks only | Quick demo | 5-10 sec |
| `/rsi/all-us-stocks` | 🐢 Very Slow | ALL US stocks | Complete scan | 1-5 min |
| `/rsi/filtered` | ⚡⚡ Fast-Medium | Stops at maxResults | Finding opportunities | 30s-2 min |

---

## 🎯 Recommended Use Cases

### **Finding Oversold Stocks (Buy Opportunities)**
```bash
curl "http://localhost:3000/technical-indicators/rsi/filtered?filter=oversold&maxResults=20"
```

### **Finding Overbought Stocks (Sell Signals)**
```bash
curl "http://localhost:3000/technical-indicators/rsi/filtered?filter=overbought&maxResults=20"
```

### **Comprehensive Market Scan** (Be Patient!)
```bash
curl "http://localhost:3000/technical-indicators/rsi/all-us-stocks?limit=500&batchSize=20"
```

### **Quick Overview of Popular Stocks**
```bash
curl "http://localhost:3000/technical-indicators/rsi/all"
```

---

## ⚙️ Technical Details

### **API Rate Limits**
- **Finnhub Free Tier**: 60 API calls per minute
- Each stock requires 1 API call for RSI
- Batch processing includes 1-second delays between batches

### **Performance Tips**
1. Use `/rsi/filtered` for specific conditions (oversold/overbought)
2. Use smaller `limit` values for `/rsi/all-us-stocks` (50-100)
3. Increase `batchSize` for faster processing (but respect API limits)

### **Error Handling**
All endpoints return consistent error responses:
```json
{
  "is_error": true,
  "code": "NOT_FOUND",
  "message": "No oversold stocks found",
  "data": null,
  "error": { /* error details */ },
  "status_code": 404
}
```

---

## 🔥 Pro Tips

1. **For Trading Signals**: Use `/rsi/filtered` with `filter=oversold` or `filter=overbought`
2. **For Market Overview**: Use `/rsi/all` (fast, 30 stocks)
3. **For Deep Analysis**: Use `/rsi/all-us-stocks` with `limit=100-200` (be patient!)
4. **For Production**: Consider caching results or running async jobs

---

## 📝 Notes

- ✅ All endpoints are **type-safe** (no `any` types)
- ✅ All endpoints support **error handling** and **logging**
- ✅ RSI values are rounded to 2 decimal places
- ✅ Status classification: 
  - `oversold`: RSI ≤ 30
  - `neutral`: 30 < RSI < 70
  - `overbought`: RSI ≥ 70

---

## 🚀 Testing

Start your server:
```bash
npm run start:dev
```

Test the endpoints:
```bash
# Quick test (30 stocks)
curl "http://localhost:3000/technical-indicators/rsi/all"

# Find oversold stocks
curl "http://localhost:3000/technical-indicators/rsi/filtered?filter=oversold&maxResults=10"

# Scan 50 stocks (will take ~1 minute)
curl "http://localhost:3000/technical-indicators/rsi/all-us-stocks?limit=50"
```

---

## ✅ Summary

**Best Choice for Most Users**: `/technical-indicators/rsi/filtered`  
- Fast enough for real-time use
- Covers entire US market
- Returns exactly what you need (oversold/overbought)
- Stops when it finds enough results

**Use `/rsi/all`** for quick demos and popular stocks only.

**Use `/rsi/all-us-stocks`** only when you need a comprehensive market scan and can wait 1-5 minutes.
