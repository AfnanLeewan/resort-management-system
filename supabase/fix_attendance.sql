-- ==============================================================================
-- FIX MISSING ATTENDANCE TABLE
-- Run this entire script in your Supabase SQL Editor to fix the "Table not found" error.
-- ==============================================================================

-- 1. Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create the missing ENUM (if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE attendance_type AS ENUM ('check-in', 'check-out', 'leave');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create the attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    type attendance_type NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    note TEXT,
    leave_reason TEXT,
    leave_date DATE
);

-- 4. Enable Security
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- 5. Add Access Policy (Allow all operations)
DO $$ BEGIN
    CREATE POLICY "Allow all for authenticated users" ON attendance_records FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. Add Performance Index
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_records(user_id);

-- 7. Force Supabase to refresh its schema cache
NOTIFY pgrst, 'reload schema';
