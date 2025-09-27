#!/bin/bash

# Real-Time Stock Data Setup Script
# This script installs all required dependencies for real-time stock data integration

echo "🚀 Setting up Real-Time Stock Data Integration..."

# Install core WebSocket dependencies
echo "📦 Installing WebSocket dependencies..."
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Install scheduling for periodic tasks
echo "📦 Installing scheduling support..."
npm install @nestjs/schedule

# Install Interactive Brokers API wrapper (choose one)
echo "📦 Installing Interactive Brokers API..."
# Option 1: IB SDK (recommended)
npm install @stoqey/ib-sdk
# Option 2: Alternative IB API
# npm install ib-api

# Install Redis for caching (optional but recommended)
echo "📦 Installing Redis client..."
npm install redis @nestjs/redis

# Install additional data provider clients (optional)
echo "📦 Installing alternative data provider clients..."
npm install alphavantage  # Alpha Vantage
npm install iex-api       # IEX Cloud
npm install @polygon.io/client-js  # Polygon.io

# Install performance monitoring
echo "📦 Installing monitoring tools..."
npm install @nestjs/terminus  # Health checks
npm install prom-client       # Prometheus metrics

# Install testing utilities
echo "📦 Installing testing utilities..."
npm install --save-dev wscat  # WebSocket testing
npm install --save-dev @types/socket.io

# Install LRU cache for memory optimization
echo "📦 Installing LRU cache..."
npm install lru-cache @types/lru-cache

echo "✅ Installation complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Set up your .env file with IBKR credentials"
echo "2. Start TWS or IB Gateway"
echo "3. Generate and run database migrations"
echo "4. Start your NestJS application"
echo ""
echo "📚 See docs/REAL_TIME_STOCK_DATA.md for detailed setup instructions"