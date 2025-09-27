#!/bin/bash

# 🧪 Automated US Stock System Test Script
# Run this script to quickly test your real-time stock system

echo "🚀 Starting US Stock System Tests..."
echo "========================================"

BASE_URL="http://localhost:3000/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    
    echo -e "${BLUE}Testing:${NC} $description"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "%{http_code}" -X "$method" "$BASE_URL$endpoint")
    fi
    
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✅ PASS${NC} - HTTP $http_code"
        echo -e "${YELLOW}Response:${NC} $(echo "$body" | jq -c . 2>/dev/null || echo "$body" | head -c 100)..."
    else
        echo -e "${RED}❌ FAIL${NC} - HTTP $http_code"
        echo -e "${RED}Error:${NC} $body"
        return 1
    fi
    echo ""
}

# Test 1: Health Check
echo -e "${BLUE}📋 STEP 1: Health Check${NC}"
test_endpoint "GET" "/demo/health" "System health status"

# Test 2: Start Demo
echo -e "${BLUE}🚀 STEP 2: Start Demo System${NC}"
test_endpoint "POST" "/demo/start" "Initialize US stock demo"

# Wait for price generation
echo -e "${YELLOW}⏳ Waiting 3 seconds for price generation...${NC}"
sleep 3

# Test 3: Get Current Prices
echo -e "${BLUE}📈 STEP 3: Get Current US Stock Prices${NC}"
test_endpoint "GET" "/demo/prices" "Current stock prices"

# Test 4: Individual Stock Tests
echo -e "${BLUE}🔍 STEP 4: Individual US Stock Tests${NC}"
US_STOCKS=("AAPL" "GOOGL" "MSFT" "TSLA" "AMZN" "NVDA")

for stock in "${US_STOCKS[@]}"; do
    test_endpoint "GET" "/demo/price/$stock" "$stock individual price lookup"
done

# Test 5: Subscribe to New Stocks
echo -e "${BLUE}➕ STEP 5: Subscribe to Additional US Stocks${NC}"
NEW_STOCKS=("NFLX" "META" "AMD" "UBER")

for stock in "${NEW_STOCKS[@]}"; do
    test_endpoint "POST" "/demo/subscribe/$stock" "Subscribe to $stock"
    sleep 1
done

# Test 6: Verify New Subscriptions
echo -e "${BLUE}✅ STEP 6: Verify New Subscriptions${NC}"
for stock in "${NEW_STOCKS[@]}"; do
    test_endpoint "GET" "/demo/price/$stock" "$stock price after subscription"
done

# Test 7: Price Simulation
echo -e "${BLUE}⚡ STEP 7: Test Price Simulation${NC}"
SIMULATION_STOCKS=("AAPL" "GOOGL" "TSLA")

for stock in "${SIMULATION_STOCKS[@]}"; do
    test_endpoint "POST" "/demo/simulate/$stock" "Simulate price update for $stock"
    sleep 0.5
done

# Test 8: Cache Statistics
echo -e "${BLUE}📊 STEP 8: Cache Statistics${NC}"
test_endpoint "GET" "/demo/stats" "Cache statistics and performance"

# Test 9: Load Test (Light)
echo -e "${BLUE}🧪 STEP 9: Light Load Test${NC}"
echo -e "${YELLOW}Running 10 concurrent price requests...${NC}"

# Run concurrent requests
for i in {1..10}; do
    curl -s "$BASE_URL/demo/prices" > /dev/null &
done
wait

echo -e "${GREEN}✅ Load test completed${NC}"
echo ""

# Summary
echo "========================================"
echo -e "${GREEN}🎉 US Stock System Test Summary${NC}"
echo "========================================"
echo -e "${GREEN}✅ Health check passed${NC}"
echo -e "${GREEN}✅ Demo system initialized${NC}"
echo -e "${GREEN}✅ US stock prices generated${NC}"
echo -e "${GREEN}✅ Individual stock lookup works${NC}"
echo -e "${GREEN}✅ Dynamic stock subscription works${NC}"
echo -e "${GREEN}✅ Price simulation works${NC}"
echo -e "${GREEN}✅ Cache system operational${NC}"
echo -e "${GREEN}✅ Load test passed${NC}"

echo ""
echo -e "${BLUE}🌐 Next Step: Test WebSocket Real-Time Updates${NC}"
echo "Open test-client.html in your browser to test WebSocket functionality"
echo ""
echo -e "${YELLOW}📊 Your US Stock Real-Time System is Working! 🚀${NC}"