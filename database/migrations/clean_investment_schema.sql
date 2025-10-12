-- Clean up Investment Info Schema Migration
-- Remove unused/confusing fields and improve structure

-- Drop unused columns from investment_info table
ALTER TABLE investment_info 
DROP COLUMN IF EXISTS name,
DROP COLUMN IF EXISTS risk_tolerance,
DROP COLUMN IF EXISTS investment_goal,
DROP COLUMN IF EXISTS expected_annual_returns,
DROP COLUMN IF EXISTS payment_slip,
DROP COLUMN IF EXISTS payment_type;

-- Rename noted to notes for clarity
ALTER TABLE investment_info 
RENAME COLUMN noted TO notes;

-- Make foreign keys NOT NULL since they should always be present
ALTER TABLE investment_info 
ALTER COLUMN customer_id SET NOT NULL,
ALTER COLUMN service_id SET NOT NULL;

-- Set default for payment_frequency
ALTER TABLE investment_info 
ALTER COLUMN payment_frequency SET DEFAULT 'monthly';

-- Drop unused columns from investment_returns table
ALTER TABLE investment_returns 
DROP COLUMN IF EXISTS payment_schedule,
DROP COLUMN IF EXISTS principal_withdrawn;

-- Update existing records
UPDATE investment_info 
SET payment_frequency = 'monthly' 
WHERE payment_frequency IS NULL;

-- Clean up any orphaned records (optional - be careful with this in production)
-- DELETE FROM investment_info WHERE customer_id IS NULL OR service_id IS NULL;

-- Update data types for better consistency
ALTER TABLE investment_info 
ALTER COLUMN notes TYPE TEXT;

-- Add constraint for payment_frequency values
ALTER TABLE investment_info 
ADD CONSTRAINT chk_payment_frequency 
CHECK (payment_frequency IN ('monthly', 'quarterly', 'yearly', 'at_maturity'));

-- Add constraint for positive amounts
ALTER TABLE investment_info 
ADD CONSTRAINT chk_positive_amount 
CHECK (CAST(requested_amount AS NUMERIC) > 0);

-- Add constraint for valid interest rates (0% to 100%)
ALTER TABLE investment_info 
ADD CONSTRAINT chk_valid_interest_rate 
CHECK (interest_rate IS NULL OR (CAST(interest_rate AS NUMERIC) >= 0 AND CAST(interest_rate AS NUMERIC) <= 1));

-- Add constraint for valid term months (1 to 120 months = 10 years max)
ALTER TABLE investment_info 
ADD CONSTRAINT chk_valid_term_months 
CHECK (term_months IS NULL OR (term_months >= 1 AND term_months <= 120));

-- Improve indexes for better performance
DROP INDEX IF EXISTS idx_investment_info_name;
CREATE INDEX idx_investment_info_customer_status ON investment_info(customer_id, status);
CREATE INDEX idx_investment_info_service_status ON investment_info(service_id, status);
CREATE INDEX idx_investment_info_maturity_date ON investment_info(maturity_date);

-- Comments for documentation
COMMENT ON TABLE investment_info IS 'Investment requests and applications for guaranteed returns';
COMMENT ON COLUMN investment_info.requested_amount IS 'Investment principal amount requested by customer';
COMMENT ON COLUMN investment_info.interest_rate IS 'Annual interest rate (decimal, e.g., 0.12 for 12%)';
COMMENT ON COLUMN investment_info.term_months IS 'Investment term in months';
COMMENT ON COLUMN investment_info.maturity_date IS 'Expected investment maturity date';
COMMENT ON COLUMN investment_info.payment_frequency IS 'Interest payment frequency schedule';
COMMENT ON COLUMN investment_info.notes IS 'Additional notes or comments';
COMMENT ON COLUMN investment_info.rejection_reason IS 'Reason for rejection if status is rejected';

COMMENT ON TABLE investment_returns IS 'Active investment positions and return tracking';
COMMENT ON COLUMN investment_returns.principal_committed IS 'Total principal amount invested';
COMMENT ON COLUMN investment_returns.principal_outstanding IS 'Principal amount still outstanding';
COMMENT ON COLUMN investment_returns.return_accrued IS 'Total interest accrued but not yet paid';
COMMENT ON COLUMN investment_returns.return_outstanding IS 'Interest accrued but not yet paid out';
COMMENT ON COLUMN investment_returns.return_paid IS 'Total interest paid out to customer';
COMMENT ON COLUMN investment_returns.effective_rate IS 'Effective annual interest rate applied';

COMMENT ON TABLE investment_ledger IS 'Complete audit trail of all investment transactions';
COMMENT ON COLUMN investment_ledger.type IS 'Transaction type (fund, accrual, payout_interest, payout_principal, adjustment, cancel)';
COMMENT ON COLUMN investment_ledger.amount IS 'Transaction amount (always positive)';
COMMENT ON COLUMN investment_ledger.effective_at IS 'Business effective date of transaction';
COMMENT ON COLUMN investment_ledger.metadata IS 'Additional transaction context and details';