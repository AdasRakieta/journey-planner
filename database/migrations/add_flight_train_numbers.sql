-- Migration: Add flight_number and train_number columns to transports table
-- Date: 2025-01-XX
-- Description: Add support for tracking flight numbers (e.g., LO123) and train numbers (e.g., TLK 12345)

-- Add flight_number column (for flights)
ALTER TABLE transports 
ADD COLUMN IF NOT EXISTS flight_number VARCHAR(50);

-- Add train_number column (for trains)
ALTER TABLE transports 
ADD COLUMN IF NOT EXISTS train_number VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN transports.flight_number IS 'Flight identification number (e.g., LO123, FR1234)';
COMMENT ON COLUMN transports.train_number IS 'Train identification number (e.g., TLK 12345, IC 5002)';

-- Verification query
-- Run this to check if columns were added successfully:
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'transports' 
-- AND column_name IN ('flight_number', 'train_number');
