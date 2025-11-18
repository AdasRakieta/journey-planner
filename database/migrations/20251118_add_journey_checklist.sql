-- Migration: add checklist JSONB column to journeys
-- Run this migration when using a real DB to allow storing checklist per journey

ALTER TABLE IF EXISTS journeys
  ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb;

-- No-op if column already exists
