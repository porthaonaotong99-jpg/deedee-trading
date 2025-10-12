-- Adds country column to stocks to store company country name/code
ALTER TABLE stocks
  ADD COLUMN IF NOT EXISTS country varchar(100) NULL;
