-- Migration: Add role column to journey_shares
-- Date: 2025-11-17
-- Adds a role column to control share permissions: 'view', 'edit', 'manage'

ALTER TABLE journey_shares
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'edit';

-- Add a simple check constraint to limit values (ignore errors if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'journey_shares_role_check'
    ) THEN
        ALTER TABLE journey_shares
        ADD CONSTRAINT journey_shares_role_check CHECK (role IN ('view','edit','manage'));
    END IF;
EXCEPTION WHEN others THEN
    -- If adding the constraint fails for any reason, continue without breaking migrations
    RAISE NOTICE 'Could not add constraint journey_shares_role_check: %', SQLERRM;
END$$;

-- Verify
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'journey_shares' AND column_name = 'role';
