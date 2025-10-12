-- Interest Rate Configuration System Migration
-- This migration adds a configurable interest rate system based on investment amount and risk tolerance

-- Create the interest_rate_configurations table
CREATE TABLE IF NOT EXISTS interest_rate_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name VARCHAR(20) NOT NULL CHECK (tier_name IN ('bronze', 'silver', 'gold', 'platinum')),
    min_amount DECIMAL(15,2) NOT NULL CHECK (min_amount >= 0),
    max_amount DECIMAL(15,2) CHECK (max_amount IS NULL OR max_amount >= min_amount),
    risk_tolerance VARCHAR(10) NOT NULL CHECK (risk_tolerance IN ('low', 'medium', 'high')),
    base_interest_rate DECIMAL(5,4) NOT NULL CHECK (base_interest_rate >= 0 AND base_interest_rate <= 1),
    risk_adjustment DECIMAL(5,4) NOT NULL DEFAULT 0.0000 CHECK (risk_adjustment >= -1 AND risk_adjustment <= 1),
    final_interest_rate DECIMAL(5,4) NOT NULL CHECK (final_interest_rate >= 0 AND final_interest_rate <= 2),
    description VARCHAR(500),
    conditions VARCHAR(200),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index for active configurations
CREATE UNIQUE INDEX idx_interest_config_active_unique 
ON interest_rate_configurations (tier_name, risk_tolerance) 
WHERE is_active = true;

-- Create indexes for performance
CREATE INDEX idx_interest_config_amount_risk 
ON interest_rate_configurations (min_amount, max_amount, risk_tolerance, is_active);

CREATE INDEX idx_interest_config_tier 
ON interest_rate_configurations (tier_name, is_active);

CREATE INDEX idx_interest_config_sort 
ON interest_rate_configurations (sort_order, tier_name);

-- Insert default interest rate configurations
INSERT INTO interest_rate_configurations (
    tier_name, min_amount, max_amount, risk_tolerance, 
    base_interest_rate, risk_adjustment, final_interest_rate,
    description, created_by, sort_order
) VALUES 
-- Bronze Tier (10K - 49K)
('bronze', 10000.00, 49999.99, 'low', 0.1200, 0.0100, 0.1300, 'Bronze tier for conservative investors - 13% returns', 'system', 1),
('bronze', 10000.00, 49999.99, 'medium', 0.1200, 0.0300, 0.1500, 'Bronze tier for moderate risk investors - 15% returns', 'system', 2),
('bronze', 10000.00, 49999.99, 'high', 0.1200, 0.0500, 0.1700, 'Bronze tier for high risk investors - 17% returns', 'system', 3),

-- Silver Tier (50K - 99K)
('silver', 50000.00, 99999.99, 'low', 0.1500, 0.0200, 0.1700, 'Silver tier for conservative investors - 17% returns', 'system', 4),
('silver', 50000.00, 99999.99, 'medium', 0.1500, 0.0400, 0.1900, 'Silver tier for moderate risk investors - 19% returns', 'system', 5),
('silver', 50000.00, 99999.99, 'high', 0.1500, 0.0600, 0.2100, 'Silver tier for high risk investors - 21% returns', 'system', 6),

-- Gold Tier (100K+)
('gold', 100000.00, NULL, 'low', 0.1800, 0.0200, 0.2000, 'Gold tier for conservative investors - 20% returns', 'system', 7),
('gold', 100000.00, NULL, 'medium', 0.1800, 0.0400, 0.2200, 'Gold tier for moderate risk investors - 22% returns', 'system', 8),
('gold', 100000.00, NULL, 'high', 0.1800, 0.0600, 0.2400, 'Gold tier for high risk investors - 24% returns', 'system', 9);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_interest_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_interest_config_updated_at
    BEFORE UPDATE ON interest_rate_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_interest_config_updated_at();

-- Add comments for documentation
COMMENT ON TABLE interest_rate_configurations IS 'Configurable interest rate settings based on investment amount and risk tolerance';
COMMENT ON COLUMN interest_rate_configurations.tier_name IS 'Investment tier name (bronze, silver, gold, platinum)';
COMMENT ON COLUMN interest_rate_configurations.min_amount IS 'Minimum investment amount for this tier';
COMMENT ON COLUMN interest_rate_configurations.max_amount IS 'Maximum investment amount for this tier (NULL = no limit)';
COMMENT ON COLUMN interest_rate_configurations.risk_tolerance IS 'Customer risk tolerance level (low, medium, high)';
COMMENT ON COLUMN interest_rate_configurations.base_interest_rate IS 'Base interest rate for the tier (decimal, e.g., 0.15 = 15%)';
COMMENT ON COLUMN interest_rate_configurations.risk_adjustment IS 'Additional rate based on risk tolerance (can be negative)';
COMMENT ON COLUMN interest_rate_configurations.final_interest_rate IS 'Calculated final rate (base_rate + risk_adjustment)';
COMMENT ON COLUMN interest_rate_configurations.conditions IS 'Special conditions or requirements for this configuration';
COMMENT ON COLUMN interest_rate_configurations.is_active IS 'Whether this configuration is currently active';
COMMENT ON COLUMN interest_rate_configurations.sort_order IS 'Sort order for displaying configurations';

-- Verify the data was inserted correctly
SELECT 
    tier_name,
    risk_tolerance,
    min_amount,
    max_amount,
    (base_interest_rate * 100) AS base_rate_percent,
    (risk_adjustment * 100) AS risk_adjustment_percent,
    (final_interest_rate * 100) AS final_rate_percent,
    description
FROM interest_rate_configurations
WHERE is_active = true
ORDER BY sort_order;