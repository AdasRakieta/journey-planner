-- Migration: Add currency column to attractions table
-- Date: 2025-11-16
-- Adds a 3-character currency code for attractions (e.g., USD, EUR, KRW)

ALTER TABLE attractions
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'PLN';

COMMENT ON COLUMN attractions.currency IS 'ISO 4217 currency code for attraction estimated_cost';

-- Verification query (run after migration):
-- SELECT column_name, data_type, character_maximum_length FROM information_schema.columns
-- WHERE table_name = 'attractions' AND column_name = 'currency';
