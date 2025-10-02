# Financial Modeling Prep (FMP) Integration Guide

## Overview

Financial Modeling Prep (FMP) has been integrated as a premium market data provider in the External Price Fetcher Service. FMP provides comprehensive financial data with excellent reliability and competitive pricing.

## Features

### Real-Time Market Data
- **Current Prices**: Real-time stock quotes with current market prices
- **OHLC Data**: Open, High, Low, Close prices for the current trading session
- **Volume**: Current trading volume
- **Previous Close**: Previous trading session's closing price
- **Market Data Coverage**: NYSE, NASDAQ, and major international exchanges

### API Endpoints Used
- **Quote Endpoint**: `/api/v3/quote/{symbol}` - Real-time quote data
- **Response Format**: JSON array with comprehensive stock information

## Setup Instructions

### 1. Get FMP API Key
1. Visit [Financial Modeling Prep](https://financialmodelingprep.com/)
2. Sign up for a free or paid account
3. Navigate to your dashboard to get your API key
4. Copy your API key for environment setup

### 2. Environment Configuration
Add your FMP API key to your `.env` file:

```bash
# Financial Modeling Prep API Key
FMP_API_KEY=your_fmp_api_key_here

# Optional: Set FMP as primary provider
MARKET_DATA_PRIMARY=fmp
```

### 3. Provider Priority
FMP has been added to the fallback chain with high priority:

```typescript
fallbackOrder: [
  'fmp',      // ← Added as first fallback (high priority)
  'finnhub',
  'alphaVantage',
  'polygon',
  'iex',
  'yahoo',
]
```

## API Limits & Pricing

### Free Tier
- **250 requests/day**
- Real-time data for US stocks
- 5+ years of historical data
- Company financials

### Paid Plans
- **Starter**: $15/month - 1,000 requests/day
- **Professional**: $50/month - 10,000 requests/day
- **Enterprise**: $150/month - 100,000 requests/day

### Rate Limiting
- FMP has generous rate limits
- No per-second restrictions mentioned
- Daily quotas based on plan

## Data Quality & Reliability

### Strengths
- ✅ **High Reliability**: Professional-grade data used by financial institutions
- ✅ **Comprehensive Coverage**: Extensive US and international stock coverage
- ✅ **Real-time Data**: Sub-second latency for market data
- ✅ **Rich Metadata**: Company profiles, financials, and fundamental data
- ✅ **API Stability**: Well-documented, stable API with consistent responses

### Response Example
```json
[
  {
    "symbol": "AAPL",
    "price": 175.43,
    "changesPercentage": 1.25,
    "change": 2.17,
    "dayLow": 173.50,
    "dayHigh": 176.89,
    "yearHigh": 182.94,
    "yearLow": 124.17,
    "marketCap": 2789234567890,
    "priceAvg50": 168.45,
    "priceAvg200": 159.23,
    "volume": 67543210,
    "avgVolume": 85432100,
    "exchange": "NASDAQ",
    "open": 174.26,
    "previousClose": 173.26,
    "eps": 6.05,
    "pe": 28.98,
    "earningsAnnouncement": "2024-01-25T16:30:00.000Z",
    "sharesOutstanding": 15908000000,
    "timestamp": 1704469200
  }
]
```

## Implementation Details

### Type Safety
The integration includes comprehensive TypeScript types:

```typescript
interface FMPQuoteResponseShape {
  symbol?: string;
  price?: number;
  changesPercentage?: number;
  change?: number;
  dayLow?: number;
  dayHigh?: number;
  yearHigh?: number;
  yearLow?: number;
  marketCap?: number;
  priceAvg50?: number;
  priceAvg200?: number;
  volume?: number;
  avgVolume?: number;
  exchange?: string;
  open?: number;
  previousClose?: number;
  eps?: number;
  pe?: number;
  earningsAnnouncement?: string;
  sharesOutstanding?: number;
  timestamp?: number;
  [k: string]: unknown;
}
```

### Error Handling
- Graceful fallback to other providers if FMP fails
- Proper error logging for debugging
- Null return on invalid responses

### Data Mapping
FMP data is mapped to the unified `ExternalQuote` interface:

```typescript
return {
  symbol: quote.symbol || symbol.toUpperCase(),
  price: quote.price,                    // Current market price
  open: toNumber(quote.open),           // Day's opening price
  high: toNumber(quote.dayHigh),        // Day's high
  low: toNumber(quote.dayLow),          // Day's low
  previousClose: toNumber(quote.previousClose), // Previous close
  volume: toNumber(quote.volume),       // Current volume
  provider: 'fmp',                      // Provider identifier
  timestamp: new Date(
    typeof quote.timestamp === 'number'
      ? quote.timestamp * 1000
      : Date.now(),
  ),
};
```

## Testing

### Manual Testing
Test the FMP integration using curl:

```bash
# Test FMP API directly
curl "https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=YOUR_FMP_API_KEY"

# Test via your application
curl "http://localhost:3000/api/stocks/quote/AAPL"
```

### Integration Testing
The service will automatically use FMP when:
1. `FMP_API_KEY` environment variable is set
2. FMP is configured as primary provider OR other providers fail
3. Valid symbol is requested

## Monitoring & Logging

### Debug Logging
Enable debug logging to monitor FMP usage:

```typescript
// In your logger configuration
{
  level: 'debug',
  // ... other config
}
```

### Metrics to Monitor
- **Request Success Rate**: Track FMP API response success
- **Response Time**: Monitor FMP API latency
- **Daily Usage**: Track against your plan limits
- **Error Patterns**: Monitor for quota exceeded or API issues

## Best Practices

### 1. API Key Security
- Store API key in environment variables only
- Never commit API keys to version control
- Use different keys for development/production

### 2. Caching Strategy
Consider implementing caching to reduce API calls:

```typescript
// Example caching pattern (not implemented yet)
private readonly cache = new Map<string, { data: ExternalQuote; expires: number }>();
```

### 3. Error Monitoring
Monitor for specific FMP error patterns:
- Quota exceeded (HTTP 429)
- Invalid API key (HTTP 401)
- Symbol not found (empty array response)

### 4. Fallback Strategy
FMP is positioned as a high-priority fallback, but ensure other providers are configured for redundancy.

## Troubleshooting

### Common Issues

1. **Empty Response Array**
   - Symbol may not exist or be delisted
   - Check symbol format (e.g., "AAPL" not "aapl")

2. **HTTP 401 Unauthorized**
   - Check API key is correct
   - Verify API key is active in FMP dashboard

3. **HTTP 429 Too Many Requests**
   - You've exceeded your daily quota
   - Consider upgrading your plan
   - Implement request caching

4. **Network Timeout**
   - FMP servers may be experiencing issues
   - Service will automatically fall back to other providers

### Support
- **FMP Documentation**: https://financialmodelingprep.com/developer/docs
- **FMP Support**: Available through their dashboard
- **Status Page**: Monitor FMP service status

## Future Enhancements

### Potential Extensions
1. **Historical Data**: Implement historical price fetching
2. **Company Fundamentals**: Add earnings, balance sheet data
3. **Crypto Support**: FMP offers cryptocurrency data
4. **Forex Data**: Currency exchange rates
5. **Economic Indicators**: GDP, inflation, employment data

### Advanced Features
1. **WebSocket Support**: Real-time streaming quotes
2. **Bulk Requests**: Multiple symbol quotes in single request
3. **Market Hours**: Trading hours and market status
4. **Options Data**: Options chains and Greeks

This integration provides a robust foundation for high-quality market data with excellent scalability options.