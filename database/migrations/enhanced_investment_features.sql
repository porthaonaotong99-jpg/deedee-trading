-- Investment Info Enhanced Fields Migration
-- Add new fields to support enhanced guaranteed returns functionality

-- Add new fields to investment_info table
ALTER TABLE investment_info 
ADD COLUMN maturity_date TIMESTAMP NULL COMMENT 'Expected maturity date of investment',
ADD COLUMN payment_frequency VARCHAR(50) NULL COMMENT 'Interest payment frequency (monthly, quarterly, yearly, at_maturity)';

-- Add new fields to investment_returns table  
ALTER TABLE investment_returns
ADD COLUMN next_payment_at TIMESTAMP NULL COMMENT 'Next scheduled interest payment date',
ADD COLUMN effective_rate NUMERIC(8,6) NULL COMMENT 'Effective annual interest rate applied',
ADD COLUMN payment_schedule VARCHAR(50) NULL COMMENT 'Payment frequency schedule',
ADD COLUMN principal_withdrawn NUMERIC(18,2) DEFAULT 0 COMMENT 'Total principal amount withdrawn/returned';

-- Add new ledger type for principal withdrawals
-- Note: This is handled by the enum in the application code, 
-- but you may need to update constraints if using CHECK constraints

-- Create indexes for better query performance
CREATE INDEX idx_investment_returns_status ON investment_returns(status);
CREATE INDEX idx_investment_returns_next_payment ON investment_returns(next_payment_at);
CREATE INDEX idx_investment_returns_maturity ON investment_returns(maturity_at);
CREATE INDEX idx_investment_ledger_type ON investment_ledger(type);
CREATE INDEX idx_investment_ledger_effective_date ON investment_ledger(effective_at);

-- Update existing records with default values
UPDATE investment_info 
SET payment_frequency = 'monthly' 
WHERE payment_frequency IS NULL;

UPDATE investment_returns 
SET payment_schedule = 'monthly',
    principal_withdrawn = 0.00
WHERE payment_schedule IS NULL;

-- Set effective_rate for existing records (use interest_rate from investment_info)
UPDATE investment_returns ir
SET effective_rate = (
    SELECT CAST(ii.interest_rate AS NUMERIC(8,6))
    FROM investment_info ii 
    WHERE ii.id = ir.investment_info_id 
    AND ii.interest_rate IS NOT NULL
)
WHERE ir.effective_rate IS NULL;

-- Set default 12% rate for records without interest rate
UPDATE investment_returns 
SET effective_rate = 0.120000 
WHERE effective_rate IS NULL;