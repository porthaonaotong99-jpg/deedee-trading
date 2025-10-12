-- Migration: add selected_price column to customer_stock_picks
ALTER TABLE IF EXISTS customer_stock_picks
  ADD COLUMN IF NOT EXISTS selected_price DECIMAL(10,2) NULL;
