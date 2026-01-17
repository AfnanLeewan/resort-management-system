-- =====================================================
-- Royyan Resort Management System - Database Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE room_type AS ENUM ('single', 'double');
CREATE TYPE room_status AS ENUM ('available', 'occupied', 'cleaning', 'maintenance');
CREATE TYPE booking_source AS ENUM ('walk-in', 'phone', 'ota');
CREATE TYPE pricing_tier AS ENUM ('general', 'tour', 'vip');
CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'qr');
CREATE TYPE user_role AS ENUM ('front-desk', 'housekeeping', 'management', 'board', 'part-time');
CREATE TYPE user_status AS ENUM ('on-duty', 'off-duty', 'on-leave');
CREATE TYPE booking_status AS ENUM ('reserved', 'checked-in', 'checked-out', 'cancelled');
CREATE TYPE charge_type AS ENUM ('room', 'early-checkin', 'late-checkout', 'discount', 'other');
CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE maintenance_status AS ENUM ('pending', 'in-progress', 'resolved');
CREATE TYPE attendance_type AS ENUM ('check-in', 'check-out', 'leave');
CREATE TYPE transaction_type AS ENUM ('in', 'out');

-- =====================================================
-- USERS TABLE
-- =====================================================

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

-- =====================================================
-- ROOMS TABLE
-- =====================================================

CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number INTEGER UNIQUE NOT NULL,
    type room_type NOT NULL,
    status room_status DEFAULT 'available',
    current_booking_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- BOOKINGS TABLE
-- =====================================================

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Guest info (embedded)
    guest_name VARCHAR(200) NOT NULL,
    guest_id_number VARCHAR(50) NOT NULL,
    guest_phone VARCHAR(20) NOT NULL,
    guest_address TEXT,
    -- Booking details
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

-- =====================================================
-- BOOKING_ROOMS (Many-to-Many for group bookings)
-- =====================================================

CREATE TABLE booking_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(booking_id, room_id)
);

-- =====================================================
-- CHARGES TABLE
-- =====================================================

CREATE TABLE charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    type charge_type NOT NULL,
    description VARCHAR(200) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    authorized_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================

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
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    paid_by UUID REFERENCES users(id)
);

-- =====================================================
-- MAINTENANCE_REPORTS TABLE
-- =====================================================

CREATE TABLE maintenance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id),
    reported_by UUID REFERENCES users(id),
    description TEXT NOT NULL,
    priority maintenance_priority DEFAULT 'medium',
    status maintenance_status DEFAULT 'pending',
    photos JSONB DEFAULT '[]'::jsonb,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- =====================================================
-- ATTENDANCE_RECORDS TABLE
-- =====================================================

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    type attendance_type NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    note TEXT,
    leave_reason TEXT,
    leave_date DATE
);

-- =====================================================
-- INVENTORY_ITEMS TABLE
-- =====================================================

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

-- =====================================================
-- INVENTORY_TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    item_name VARCHAR(200) NOT NULL, -- Cached for history
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

-- =====================================================
-- COUNTERS TABLE (for receipt/invoice numbers)
-- =====================================================

CREATE TABLE counters (
    id VARCHAR(50) PRIMARY KEY,
    value INTEGER DEFAULT 0
);

-- Initialize counters
INSERT INTO counters (id, value) VALUES ('receipt', 0);
INSERT INTO counters (id, value) VALUES ('invoice', 0);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_maintenance_status ON maintenance_reports(status);
CREATE INDEX idx_attendance_user ON attendance_records(user_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_inventory_category ON inventory_items(category);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

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

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
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

-- Allow all operations for authenticated users (simple policy)
-- In production, you'd want more granular policies
CREATE POLICY "Allow all for authenticated users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON rooms FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON bookings FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON booking_rooms FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON charges FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON payments FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON maintenance_reports FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON attendance_records FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON inventory_items FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON inventory_transactions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON counters FOR ALL USING (true);

-- =====================================================
-- SEED DATA: Default Users
-- =====================================================

INSERT INTO users (username, name, role, phone, status, is_online, shifts) VALUES
    ('frontdesk', 'Front Desk', 'front-desk', '081-234-5678', 'on-duty', true, 
     '[{"day": "Mon", "start": "08:00", "end": "17:00"}, {"day": "Tue", "start": "08:00", "end": "17:00"}, {"day": "Wed", "start": "08:00", "end": "17:00"}, {"day": "Thu", "start": "08:00", "end": "17:00"}, {"day": "Fri", "start": "08:00", "end": "17:00"}]'),
    ('housekeeping', 'Housekeeping', 'housekeeping', '081-234-5679', 'off-duty', false,
     '[{"day": "Wed", "start": "09:00", "end": "18:00"}, {"day": "Thu", "start": "09:00", "end": "18:00"}, {"day": "Fri", "start": "09:00", "end": "18:00"}, {"day": "Sat", "start": "09:00", "end": "18:00"}, {"day": "Sun", "start": "09:00", "end": "18:00"}]'),
    ('manager', 'Manager', 'management', '081-234-5680', 'on-duty', true, '[]'),
    ('board', 'Board Director', 'board', '081-234-5681', 'off-duty', false, '[]');

-- =====================================================
-- SEED DATA: 30 Rooms
-- =====================================================

-- Single beds (1-20)
INSERT INTO rooms (number, type, status)
SELECT generate_series(1, 20), 'single'::room_type, 'available'::room_status;

-- Double beds (21-30)
INSERT INTO rooms (number, type, status)
SELECT generate_series(21, 30), 'double'::room_type, 'available'::room_status;

-- =====================================================
-- FUNCTIONS: Counter Increment
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_counter(counter_id VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    next_val INTEGER;
BEGIN
    UPDATE counters SET value = value + 1 WHERE id = counter_id RETURNING value INTO next_val;
    RETURN next_val;
END;
$$ LANGUAGE plpgsql;
