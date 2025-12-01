-- Migration: Add order_index and priority to attractions table
-- Date: 2025-12-01
-- Purpose: Enable detailed itinerary planning with ordering and priority levels

-- Add order_index for sorting attractions within a stop (or globally)
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Add priority level for indicating must-see vs optional attractions
-- 'must' = must visit, 'should' = should visit if time allows, 'could' = nice to have, 'skip' = skip if short on time
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'should' CHECK (priority IN ('must', 'should', 'could', 'skip'));

-- Add an index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_attractions_stop_order ON attractions(stop_id, order_index);

-- Add planned_date for scheduling attractions on specific days
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS planned_date DATE;

-- Add planned_time for specific time slots (HH:MM format stored as TIME)
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS planned_time TIME;

-- Update existing attractions to have sequential order_index per stop
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY stop_id ORDER BY id) - 1 as new_order
  FROM attractions
)
UPDATE attractions 
SET order_index = numbered.new_order
FROM numbered
WHERE attractions.id = numbered.id AND attractions.order_index = 0;

-- Add order_index to stops for sorting stops within a journey
ALTER TABLE stops ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Update existing stops to have sequential order_index per journey
WITH numbered_stops AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY journey_id ORDER BY arrival_date, id) - 1 as new_order
  FROM stops
)
UPDATE stops 
SET order_index = numbered_stops.new_order
FROM numbered_stops
WHERE stops.id = numbered_stops.id AND stops.order_index = 0;

CREATE INDEX IF NOT EXISTS idx_stops_journey_order ON stops(journey_id, order_index);
