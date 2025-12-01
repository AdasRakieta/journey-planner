-- Migration: Add missing fields to attractions table
-- Date: 2025-12-01
-- Description: Adds fields for itinerary planning, geolocation, and address details

-- Add address fields (if not exists)
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS address_street VARCHAR(255);
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS address_city VARCHAR(255);
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS address_postal_code VARCHAR(32);
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS address_country VARCHAR(255);

-- Add geolocation fields (if not exists)
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add itinerary planning fields (if not exists)
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS visit_time VARCHAR(5);
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS priority VARCHAR(10) CHECK (priority IN ('must', 'should', 'could', 'skip'));
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS planned_date DATE;
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS planned_time VARCHAR(5);

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_attractions_planned_date ON attractions(planned_date);
CREATE INDEX IF NOT EXISTS idx_attractions_order_index ON attractions(order_index);
CREATE INDEX IF NOT EXISTS idx_attractions_latitude_longitude ON attractions(latitude, longitude);

-- Update existing rows to have default order_index if NULL
UPDATE attractions SET order_index = 0 WHERE order_index IS NULL;

COMMIT;
