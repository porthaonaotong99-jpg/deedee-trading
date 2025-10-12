-- Adds linkage columns for interest rate configuration IDs on requests and transactions
-- Safe to run multiple times due to IF NOT EXISTS guards

-- Investment Requests: store the selected interest configuration used for approval
ALTER TABLE investment_requests
  ADD COLUMN IF NOT EXISTS approved_interest_config_id uuid NULL;

COMMENT ON COLUMN investment_requests.approved_interest_config_id IS 'Linked interest_rate_configurations.id used for approval';

-- Investment Transactions: persist the applied interest configuration per approved investment
ALTER TABLE investment_transactions
  ADD COLUMN IF NOT EXISTS interest_rate_config_id uuid NULL;

COMMENT ON COLUMN investment_transactions.interest_rate_config_id IS 'interest_rate_configurations.id applied to this transaction';
