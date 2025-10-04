-- Migration: Add payment slip functionality to customer_stock_pick table
-- Date: 2024
-- Description: Add payment slip fields to support simple admin approval workflow

-- Add new enum value to customer_pick_status_enum
ALTER TYPE customer_pick_status_enum ADD VALUE IF NOT EXISTS 'PAYMENT_SUBMITTED';

-- Add payment slip columns to customer_stock_pick table
ALTER TABLE customer_stock_pick 
ADD COLUMN IF NOT EXISTS payment_slip_url VARCHAR,
ADD COLUMN IF NOT EXISTS payment_slip_filename VARCHAR,
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR,
ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMP;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_customer_stock_pick_payment_status 
ON customer_stock_pick(status) 
WHERE status = 'PAYMENT_SUBMITTED';

CREATE INDEX IF NOT EXISTS idx_customer_stock_pick_payment_submitted_at 
ON customer_stock_pick(payment_submitted_at) 
WHERE payment_submitted_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN customer_stock_pick.payment_slip_url IS 'URL to the uploaded payment slip file';
COMMENT ON COLUMN customer_stock_pick.payment_slip_filename IS 'Original filename of the payment slip';
COMMENT ON COLUMN customer_stock_pick.payment_amount IS 'Amount paid by customer';
COMMENT ON COLUMN customer_stock_pick.payment_reference IS 'Payment reference number or transaction ID';
COMMENT ON COLUMN customer_stock_pick.payment_submitted_at IS 'Timestamp when payment slip was submitted';