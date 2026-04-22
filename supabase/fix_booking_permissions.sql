-- =====================================================
-- Fix: Booking permissions for anon role
-- Run this in Supabase SQL Editor if bookings cannot be created
-- =====================================================

-- Drop old policies that may not apply to the anon role
DROP POLICY IF EXISTS "Allow all for authenticated users" ON users;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON rooms;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON bookings;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON booking_rooms;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON charges;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON payments;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON maintenance_reports;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON attendance_records;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON inventory_items;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON inventory_transactions;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON counters;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON staff_line_mapping;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON line_notifications;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON line_cleaning_tasks;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON line_registration_codes;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON line_bot_config;

-- Create new policies that explicitly include the anon role
CREATE POLICY "Allow all for anon and authenticated" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon and authenticated" ON rooms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon and authenticated" ON bookings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon and authenticated" ON booking_rooms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon and authenticated" ON charges FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon and authenticated" ON payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon and authenticated" ON maintenance_reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon and authenticated" ON attendance_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon and authenticated" ON inventory_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon and authenticated" ON inventory_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon and authenticated" ON counters FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Handle optional LINE tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff_line_mapping') THEN
    BEGIN
      CREATE POLICY "Allow all for anon and authenticated" ON staff_line_mapping FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'line_notifications') THEN
    BEGIN
      CREATE POLICY "Allow all for anon and authenticated" ON line_notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'line_cleaning_tasks') THEN
    BEGIN
      CREATE POLICY "Allow all for anon and authenticated" ON line_cleaning_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'line_registration_codes') THEN
    BEGIN
      CREATE POLICY "Allow all for anon and authenticated" ON line_registration_codes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'line_bot_config') THEN
    BEGIN
      CREATE POLICY "Allow all for anon and authenticated" ON line_bot_config FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Grant table privileges to anon and authenticated roles
-- This is required for PostgREST to allow INSERT/UPDATE/DELETE via the Supabase anon key
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
