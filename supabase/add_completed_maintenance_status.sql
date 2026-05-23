-- Migration: Add 'completed' value to maintenance_status ENUM
-- Run this in Supabase SQL Editor for existing databases
-- Issue: https://github.com/AfnanLeewan/resort-management-system/issues/20

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'completed'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'maintenance_status')
    ) THEN
        ALTER TYPE maintenance_status ADD VALUE 'completed' AFTER 'in-progress';
    END IF;
END;
$$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
