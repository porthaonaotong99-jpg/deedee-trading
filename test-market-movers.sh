#!/bin/bash

# Test script for market movers endpoint
# Usage: ./test-market-movers.sh

echo "🧪 Testing Market Movers Endpoint..."
echo "===================================="
echo ""

# Check if server is running
echo "1️⃣  Checking if server is running..."
if ! curl -s http://localhost:3000/technical-indicators/health-check > /dev/null 2>&1; then
    echo "❌ Server is not running!"
    echo "   Please start the server first: npm run start:dev"
    exit 1
fi
echo "✅ Server is running"
echo ""

# Test market movers endpoint
echo "2️⃣  Fetching market movers..."
response=$(curl -s http://localhost:3000/technical-indicators/market-movers)

# Check if response contains data
if echo "$response" | grep -q "topGainers"; then
    echo "✅ Market movers endpoint is working!"
    echo ""
    
    # Pretty print the response
    echo "📊 Response Data:"
    echo "================"
    echo "$response" | python3 -m json.tool | head -n 50
    echo ""
    echo "... (response truncated)"
    echo ""
    
    # Extract summary info
    gainers_count=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('data', {}).get('topGainers', [])))")
    losers_count=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('data', {}).get('topLosers', [])))")
    
    echo "📈 Summary:"
    echo "=========="
    echo "Top Gainers: $gainers_count stocks"
    echo "Top Losers: $losers_count stocks"
    echo ""
    
    # Show top gainer
    echo "🏆 Top Gainer:"
    echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
gainers = data.get('data', {}).get('topGainers', [])
if gainers:
    top = gainers[0]
    print(f\"   {top['symbol']}: ${top['lastPrice']:.2f} ({top['changePercent']:+.2f}%)\")
"
    echo ""
    
    # Show top loser
    echo "📉 Top Loser:"
    echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
losers = data.get('data', {}).get('topLosers', [])
if losers:
    top = losers[0]
    print(f\"   {top['symbol']}: ${top['lastPrice']:.2f} ({top['changePercent']:+.2f}%)\")
"
    echo ""
    
    echo "✅ All tests passed!"
    echo ""
    echo "🎉 Your market movers endpoint is working perfectly!"
    echo ""
    echo "Next steps:"
    echo "• Use this endpoint in your frontend: GET /technical-indicators/market-movers"
    echo "• Check the full guide: TOP_GAINERS_LOSERS_GUIDE.md"
    
else
    echo "❌ Unexpected response format"
    echo "Response:"
    echo "$response"
fi
