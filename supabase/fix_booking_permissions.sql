-- =====================================================
-- Fix Booking Permissions Migration
-- Run this in Supabase SQL Editor to fix INSERT permissions
-- for the anon/authenticated roles on existing databases.
-- =====================================================

-- =====================================================
-- STEP 1: Grant permissions on core tables (always exist)
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE rooms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bookings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE booking_rooms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE charges TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE payments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE maintenance_reports TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE attendance_records TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE inventory_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE inventory_transactions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE counters TO anon, authenticated;

-- =====================================================
-- STEP 2: Grant permissions on LINE tables if they exist
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_line_mapping') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE staff_line_mapping TO anon, authenticated';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'line_notifications') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE line_notifications TO anon, authenticated';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'line_cleaning_tasks') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE line_cleaning_tasks TO anon, authenticated';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'line_registration_codes') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE line_registration_codes TO anon, authenticated';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'line_bot_config') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE line_bot_config TO anon, authenticated';
    END IF;
END;
$$;

-- =====================================================
-- STEP 3: Fix RLS policies on core tables
-- Drop old policies and recreate with proper WITH CHECK
-- =====================================================

-- bookings
DROP POLICY IF EXISTS "Allow all for authenticated users" ON bookings;
CREATE POLICY "Allow all" ON bookings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- booking_rooms
DROP POLICY IF EXISTS "Allow all for authenticated users" ON booking_rooms;
CREATE POLICY "Allow all" ON booking_rooms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- charges
DROP POLICY IF EXISTS "Allow all for authenticated users" ON charges;
CREATE POLICY "Allow all" ON charges FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- payments
DROP POLICY IF EXISTS "Allow all for authenticated users" ON payments;
CREATE POLICY "Allow all" ON payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- rooms
DROP POLICY IF EXISTS "Allow all for authenticated users" ON rooms;
CREATE POLICY "Allow all" ON rooms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- users
DROP POLICY IF EXISTS "Allow all for authenticated users" ON users;
CREATE POLICY "Allow all" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- maintenance_reports
DROP POLICY IF EXISTS "Allow all for authenticated users" ON maintenance_reports;
CREATE POLICY "Allow all" ON maintenance_reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- attendance_records
DROP POLICY IF EXISTS "Allow all for authenticated users" ON attendance_records;
CREATE POLICY "Allow all" ON attendance_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- inventory_items
DROP POLICY IF EXISTS "Allow all for authenticated users" ON inventory_items;
CREATE POLICY "Allow all" ON inventory_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- inventory_transactions
DROP POLICY IF EXISTS "Allow all for authenticated users" ON inventory_transactions;
CREATE POLICY "Allow all" ON inventory_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- counters
DROP POLICY IF EXISTS "Allow all for authenticated users" ON counters;
CREATE POLICY "Allow all" ON counters FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- STEP 4: Refresh schema cache
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- Done!
SELECT 'Permissions fixed successfully!' AS result;
