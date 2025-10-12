# Database Migration for Enhanced Stock Entity

This file contains the SQL commands to migrate your existing stock table to support comprehensive U.S. stock data.

## Run this migration after enhancing the Stock entity

```sql
-- Add new columns for enhanced stock data
ALTER TABLE stocks 
ADD COLUMN currency VARCHAR(10) DEFAULT 'USD',
ADD COLUMN exchange VARCHAR(20) DEFAULT 'SMART',
ADD COLUMN primary_exchange VARCHAR(50),
ADD COLUMN security_type VARCHAR(20) DEFAULT 'STK',
ADD COLUMN ibkr_contract_id BIGINT UNIQUE,
ADD COLUMN local_symbol VARCHAR(50),
ADD COLUMN company VARCHAR(500),
ADD COLUMN description VARCHAR(1000),
ADD COLUMN industry VARCHAR(50),
ADD COLUMN sector VARCHAR(50),
ADD COLUMN market_cap BIGINT,
ADD COLUMN shares_outstanding BIGINT,
ADD COLUMN previous_close DECIMAL(10,4),
ADD COLUMN open_price DECIMAL(10,4),
ADD COLUMN bid_price DECIMAL(10,4),
ADD COLUMN ask_price DECIMAL(10,4),
ADD COLUMN bid_size INTEGER,
ADD COLUMN ask_size INTEGER,
ADD COLUMN high_price DECIMAL(10,4),
ADD COLUMN low_price DECIMAL(10,4),
ADD COLUMN volume BIGINT,
ADD COLUMN change DECIMAL(10,4),
ADD COLUMN change_percent DECIMAL(5,2),
ADD COLUMN min_tick DECIMAL(10,4),
ADD COLUMN min_size INTEGER,
ADD COLUMN is_tradable BOOLEAN DEFAULT TRUE,
ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN market_status VARCHAR(20),
ADD COLUMN market_open_time TIME,
ADD COLUMN market_close_time TIME,
ADD COLUMN last_price_update TIMESTAMP,
ADD COLUMN last_trade_time TIMESTAMP,
ADD COLUMN pe_ratio DECIMAL(10,4),
ADD COLUMN dividend_yield DECIMAL(5,4),
ADD COLUMN eps DECIMAL(10,4),
ADD COLUMN week_52_high DECIMAL(10,4),
ADD COLUMN week_52_low DECIMAL(10,4),
ADD COLUMN data_source VARCHAR(50),
ADD COLUMN data_type VARCHAR(20) DEFAULT 'DELAYED',
ADD COLUMN data_delay_minutes INTEGER DEFAULT 15;

-- Modify existing columns
ALTER TABLE stocks 
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN name TYPE VARCHAR(255),
ALTER COLUMN symbol SET NOT NULL,
ALTER COLUMN symbol TYPE VARCHAR(10),
ALTER COLUMN last_price TYPE DECIMAL(10,4);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_stocks_exchange ON stocks(exchange);
CREATE INDEX IF NOT EXISTS idx_stocks_last_price_update ON stocks(last_price_update);
CREATE INDEX IF NOT EXISTS idx_stocks_last_price ON stocks(last_price);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stocks_symbol_exchange ON stocks(symbol, exchange);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stocks_ibkr_contract ON stocks(ibkr_contract_id) WHERE ibkr_contract_id IS NOT NULL;

-- Update existing data with default values
UPDATE stocks 
SET 
  currency = 'USD',
  exchange = 'SMART',
  security_type = 'STK',
  is_tradable = TRUE,
  is_active = TRUE,
  data_type = 'DELAYED',
  data_delay_minutes = 15
WHERE currency IS NULL;

-- Create separate table for historical price data (recommended for performance)
CREATE TABLE IF NOT EXISTS stock_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  open_price DECIMAL(10,4),
  high_price DECIMAL(10,4),
  low_price DECIMAL(10,4),
  close_price DECIMAL(10,4),
  volume BIGINT,
  timestamp TIMESTAMP NOT NULL,
  interval_type VARCHAR(10) NOT NULL, -- '1m', '5m', '1h', '1d', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_price_history_stock_time (stock_id, timestamp),
  INDEX idx_price_history_timestamp (timestamp),
  INDEX idx_price_history_interval (interval_type)
) PARTITION BY RANGE (timestamp);

-- Create partitions for price history (monthly partitions)
-- This helps with query performance for large datasets
CREATE TABLE stock_price_history_2025_09 PARTITION OF stock_price_history
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

CREATE TABLE stock_price_history_2025_10 PARTITION OF stock_price_history
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Add more partitions as needed

-- Create table for real-time tick data (optional - for high-frequency data)
CREATE TABLE IF NOT EXISTS stock_ticks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  tick_type INTEGER, -- IBKR tick types
  tick_value DECIMAL(15,6),
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_ticks_stock_time (stock_id, timestamp),
  INDEX idx_ticks_timestamp (timestamp)
) PARTITION BY RANGE (timestamp);

-- Create additional tables for options, futures if needed
CREATE TABLE IF NOT EXISTS stock_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  underlying_stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
  symbol VARCHAR(50) NOT NULL,
  strike_price DECIMAL(10,4),
  expiration_date DATE,
  option_type VARCHAR(4), -- 'CALL' or 'PUT'
  ibkr_contract_id BIGINT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_options_underlying (underlying_stock_id),
  INDEX idx_options_expiration (expiration_date),
  INDEX idx_options_strike (strike_price)
);

-- Performance optimization: Update table statistics
ANALYZE stocks;
ANALYZE stock_price_history;
```

## Environment Variables

Add these to your `.env` file:

```env
# Interactive Brokers Configuration
IBKR_HOST=127.0.0.1
IBKR_PORT=7497  # Paper trading: 7497, Live: 7496
IBKR_CLIENT_ID=1
IBKR_TIMEOUT=30000

# Market Data Configuration
ENABLE_REAL_TIME_DATA=true
DATA_CACHE_TTL=300000  # 5 minutes in milliseconds
PRICE_UPDATE_INTERVAL=1000  # 1 second in milliseconds
MAX_SUBSCRIBED_SYMBOLS=1000

# WebSocket Configuration
WEBSOCKET_CORS_ORIGIN=http://localhost:3000,http://localhost:3001
WEBSOCKET_MAX_CONNECTIONS=1000

# Redis Configuration (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Alternative Data Providers (optional)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
IEX_CLOUD_API_KEY=your_iex_cloud_key
POLYGON_API_KEY=your_polygon_api_key

# Monitoring
ENABLE_HEALTH_CHECKS=true
ENABLE_METRICS=true
LOG_LEVEL=debug
```

## TypeORM Migration Command

If using TypeORM CLI, generate the migration:

```bash
# Generate migration
npm run typeorm:generate -- --name=EnhanceStockEntity

# Run migration
npm run typeorm:run

# Revert migration (if needed)
npm run typeorm:revert
```