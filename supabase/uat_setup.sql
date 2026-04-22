-- =====================================================
-- Royyan Resort Management System - UAT Database Setup
-- COMPLETE SCHEMA - Run in Supabase SQL Editor
-- Generated: 2025-01-20
-- =====================================================

-- This script consolidates all migrations into a single file
-- for setting up a fresh UAT environment.

-- =====================================================
-- PART 1: EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PART 2: ENUM TYPES
-- =====================================================

CREATE TYPE room_type AS ENUM ('single', 'double');
CREATE TYPE room_status AS ENUM ('available', 'occupied', 'cleaning', 'maintenance');
CREATE TYPE booking_source AS ENUM ('walk-in', 'phone', 'ota');
CREATE TYPE pricing_tier AS ENUM ('general', 'tour', 'vip');
CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'qr');
CREATE TYPE user_role AS ENUM ('front-desk', 'housekeeping', 'management', 'board', 'part-time', 'repair');
CREATE TYPE user_status AS ENUM ('on-duty', 'off-duty', 'on-leave');
CREATE TYPE booking_status AS ENUM ('reserved', 'checked-in', 'checked-out', 'cancelled');
CREATE TYPE charge_type AS ENUM ('room', 'early-checkin', 'late-checkout', 'discount', 'other');
CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE maintenance_status AS ENUM ('pending', 'in-progress', 'resolved');
CREATE TYPE attendance_type AS ENUM ('check-in', 'check-out', 'leave');
CREATE TYPE transaction_type AS ENUM ('in', 'out');

-- =====================================================
-- PART 3: CORE TABLES
-- =====================================================

-- USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'front-desk',
    phone VARCHAR(20),
    photo_url TEXT,
    status user_status DEFAULT 'off-duty',
    last_check_in TIMESTAMPTZ,
    last_check_out TIMESTAMPTZ,
    is_online BOOLEAN DEFAULT FALSE,
    shifts JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROOMS TABLE
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number INTEGER UNIQUE NOT NULL,
    type room_type NOT NULL,
    status room_status DEFAULT 'available',
    current_booking_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOOKINGS TABLE
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_name VARCHAR(200) NOT NULL,
    guest_id_number VARCHAR(50) NOT NULL,
    guest_phone VARCHAR(20) NOT NULL,
    guest_address TEXT,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    actual_check_in_time TIMESTAMPTZ,
    actual_check_out_time TIMESTAMPTZ,
    pricing_tier pricing_tier NOT NULL DEFAULT 'general',
    base_rate DECIMAL(10, 2) NOT NULL,
    deposit DECIMAL(10, 2),
    source booking_source NOT NULL DEFAULT 'walk-in',
    status booking_status DEFAULT 'reserved',
    group_name VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- BOOKING_ROOMS (Many-to-Many for group bookings)
CREATE TABLE booking_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(booking_id, room_id)
);

-- CHARGES TABLE
CREATE TABLE charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    type charge_type NOT NULL,
    description VARCHAR(200) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    authorized_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS TABLE
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    amount DECIMAL(10, 2) NOT NULL,
    method payment_method NOT NULL,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    vat DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    deposit DECIMAL(10, 2),
    balance_due DECIMAL(10, 2),
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    paid_by UUID REFERENCES users(id)
);

-- MAINTENANCE_REPORTS TABLE
CREATE TABLE maintenance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id),
    reported_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    description TEXT NOT NULL,
    priority maintenance_priority DEFAULT 'medium',
    status maintenance_status DEFAULT 'pending',
    photos JSONB DEFAULT '[]'::jsonb,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ATTENDANCE_RECORDS TABLE
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    type attendance_type NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    note TEXT,
    leave_reason TEXT,
    leave_date DATE
);

-- INVENTORY_ITEMS TABLE
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    min_level INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVENTORY_TRANSACTIONS TABLE
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    item_name VARCHAR(200) NOT NULL,
    date DATE NOT NULL,
    type transaction_type NOT NULL,
    quantity INTEGER NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    balance_after INTEGER NOT NULL,
    payer VARCHAR(200) NOT NULL,
    receiver VARCHAR(200) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- COUNTERS TABLE (for receipt/invoice numbers)
CREATE TABLE counters (
    id VARCHAR(50) PRIMARY KEY,
    value INTEGER DEFAULT 0
);

-- =====================================================
-- PART 4: LINE INTEGRATION TABLES
-- =====================================================

-- STAFF_LINE_MAPPING TABLE
CREATE TABLE staff_line_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    line_user_id VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    picture_url TEXT,
    registration_code VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    rich_menu_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- LINE_NOTIFICATIONS TABLE
CREATE TABLE line_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_user_id UUID REFERENCES users(id),
    recipient_line_id VARCHAR(50) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    related_room_id UUID REFERENCES rooms(id),
    related_maintenance_id UUID REFERENCES maintenance_reports(id),
    message_content JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LINE_CLEANING_TASKS TABLE
CREATE TABLE line_cleaning_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id),
    booking_id UUID REFERENCES bookings(id),
    assigned_to UUID REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'inspected', 'needs_repair', 'pending_repair_details')),
    checkout_time TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    inspected_at TIMESTAMPTZ,
    inspected_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LINE_REGISTRATION_CODES TABLE
CREATE TABLE line_registration_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(10) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_by_line_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LINE_BOT_CONFIG TABLE
CREATE TABLE line_bot_config (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    channel_id VARCHAR(100),
    channel_secret VARCHAR(100),
    channel_access_token TEXT,
    housekeeper_rich_menu_id VARCHAR(100),
    technician_rich_menu_id VARCHAR(100),
    admin_rich_menu_id VARCHAR(100),
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 5: INDEXES
-- =====================================================

CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_maintenance_status ON maintenance_reports(status);
CREATE INDEX idx_maintenance_assigned_to ON maintenance_reports(assigned_to);
CREATE INDEX idx_attendance_user ON attendance_records(user_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_inventory_category ON inventory_items(category);
CREATE INDEX idx_staff_line_user_id ON staff_line_mapping(line_user_id);
CREATE INDEX idx_staff_line_status ON staff_line_mapping(status);
CREATE INDEX idx_line_notifications_type ON line_notifications(notification_type);
CREATE INDEX idx_line_notifications_status ON line_notifications(status);
CREATE INDEX idx_cleaning_tasks_status ON line_cleaning_tasks(status);
CREATE INDEX idx_registration_codes_code ON line_registration_codes(code);

-- =====================================================
-- PART 6: FUNCTIONS
-- =====================================================

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Counter increment function
CREATE OR REPLACE FUNCTION get_next_counter(counter_id VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    next_val INTEGER;
BEGIN
    UPDATE counters SET value = value + 1 WHERE id = counter_id RETURNING value INTO next_val;
    RETURN next_val;
END;
$$ LANGUAGE plpgsql;

-- Generate LINE registration code
CREATE OR REPLACE FUNCTION generate_line_registration_code(p_user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_code VARCHAR(10);
BEGIN
    v_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
    DELETE FROM line_registration_codes 
    WHERE user_id = p_user_id AND used_at IS NULL;
    INSERT INTO line_registration_codes (user_id, code, expires_at)
    VALUES (p_user_id, v_code, NOW() + INTERVAL '24 hours');
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Get online housekeepers with LINE
CREATE OR REPLACE FUNCTION get_online_housekeepers_with_line()
RETURNS TABLE(user_id UUID, line_user_id VARCHAR(50), name VARCHAR(100)) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, slm.line_user_id, u.name
    FROM users u
    JOIN staff_line_mapping slm ON slm.user_id = u.id
    WHERE u.role = 'housekeeping'
      AND u.status = 'on-duty'
      AND slm.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Get online technicians with LINE
CREATE OR REPLACE FUNCTION get_online_technicians_with_line()
RETURNS TABLE(user_id UUID, line_user_id VARCHAR(50), name VARCHAR(100)) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, slm.line_user_id, u.name
    FROM users u
    JOIN staff_line_mapping slm ON slm.user_id = u.id
    WHERE u.role = 'repair'
      AND u.status = 'on-duty'
      AND slm.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Get admins with LINE
CREATE OR REPLACE FUNCTION get_admins_with_line()
RETURNS TABLE(user_id UUID, line_user_id VARCHAR(50), name VARCHAR(100)) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, slm.line_user_id, u.name
    FROM users u
    JOIN staff_line_mapping slm ON slm.user_id = u.id
    WHERE u.role IN ('management', 'front-desk')
      AND slm.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 7: TRIGGERS
-- =====================================================

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_line_mapping_updated_at
    BEFORE UPDATE ON staff_line_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_line_bot_config_updated_at
    BEFORE UPDATE ON line_bot_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 8: ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_line_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_cleaning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_registration_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_bot_config ENABLE ROW LEVEL SECURITY;

-- Allow all operations (simplified policies) for anon and authenticated roles
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
CREATE POLICY "Allow all for anon and authenticated" ON staff_line_mapping FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon and authenticated" ON line_notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon and authenticated" ON line_cleaning_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon and authenticated" ON line_registration_codes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon and authenticated" ON line_bot_config FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Grant table privileges to anon and authenticated roles
-- Required for PostgREST to allow INSERT/UPDATE/DELETE via the anon key
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- PART 9: SEED DATA
-- =====================================================

-- Initialize counters
INSERT INTO counters (id, value) VALUES ('receipt', 0);
INSERT INTO counters (id, value) VALUES ('invoice', 0);

-- Initialize LINE bot config
INSERT INTO line_bot_config (id) VALUES ('default');

-- Default Users
INSERT INTO users (username, name, role, phone, status, is_online, shifts) VALUES
    ('frontdesk', 'Front Desk', 'front-desk', '081-234-5678', 'on-duty', true, 
     '[{"day": "Mon", "start": "08:00", "end": "17:00"}, {"day": "Tue", "start": "08:00", "end": "17:00"}, {"day": "Wed", "start": "08:00", "end": "17:00"}, {"day": "Thu", "start": "08:00", "end": "17:00"}, {"day": "Fri", "start": "08:00", "end": "17:00"}]'),
    ('housekeeping', 'Housekeeping', 'housekeeping', '081-234-5679', 'off-duty', false,
     '[{"day": "Wed", "start": "09:00", "end": "18:00"}, {"day": "Thu", "start": "09:00", "end": "18:00"}, {"day": "Fri", "start": "09:00", "end": "18:00"}, {"day": "Sat", "start": "09:00", "end": "18:00"}, {"day": "Sun", "start": "09:00", "end": "18:00"}]'),
    ('manager', 'Manager', 'management', '081-234-5680', 'on-duty', true, '[]'),
    ('board', 'Board Director', 'board', '081-234-5681', 'off-duty', false, '[]');

-- Create 30 Rooms (Single beds 1-20, Double beds 21-30)
INSERT INTO rooms (number, type, status)
SELECT generate_series(1, 20), 'single'::room_type, 'available'::room_status;

INSERT INTO rooms (number, type, status)
SELECT generate_series(21, 30), 'double'::room_type, 'available'::room_status;

-- =====================================================
-- PART 10: REFRESH SCHEMA CACHE
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- UAT SETUP COMPLETE!
-- =====================================================
