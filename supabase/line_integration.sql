-- =====================================================
-- LINE Integration - Database Schema Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add 'repair' role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'repair';

-- =====================================================
-- STAFF_LINE_MAPPING TABLE
-- Maps staff to their LINE User IDs for push messages
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_line_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    line_user_id VARCHAR(50) UNIQUE NOT NULL, -- LINE's Uxxxxxxxx format
    display_name VARCHAR(100),
    picture_url TEXT,
    registration_code VARCHAR(20), -- Temp code for registration
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    rich_menu_id VARCHAR(100), -- Current rich menu assigned
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =====================================================
-- LINE_NOTIFICATIONS TABLE
-- Log all notifications sent
-- =====================================================

CREATE TABLE IF NOT EXISTS line_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_user_id UUID REFERENCES users(id),
    recipient_line_id VARCHAR(50) NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'checkout_alert', 'repair_request', 'repair_complete', 'clean_complete'
    related_room_id UUID REFERENCES rooms(id),
    related_maintenance_id UUID REFERENCES maintenance_reports(id),
    message_content JSONB, -- Store the flex message content
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- LINE_CLEANING_TASKS TABLE
-- Track cleaning tasks sent via LINE
-- =====================================================

CREATE TABLE IF NOT EXISTS line_cleaning_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id),
    booking_id UUID REFERENCES bookings(id),
    assigned_to UUID REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'inspected')),
    checkout_time TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    inspected_at TIMESTAMPTZ,
    inspected_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- LINE_REGISTRATION_CODES TABLE
-- Temporary codes for staff to register their LINE accounts
-- =====================================================

CREATE TABLE IF NOT EXISTS line_registration_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(10) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_by_line_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- LINE_BOT_CONFIG TABLE
-- Store LINE bot configuration
-- =====================================================

CREATE TABLE IF NOT EXISTS line_bot_config (
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

-- Initialize default config
INSERT INTO line_bot_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_staff_line_user_id ON staff_line_mapping(line_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_line_status ON staff_line_mapping(status);
CREATE INDEX IF NOT EXISTS idx_line_notifications_type ON line_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_line_notifications_status ON line_notifications(status);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_status ON line_cleaning_tasks(status);
CREATE INDEX IF NOT EXISTS idx_registration_codes_code ON line_registration_codes(code);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE staff_line_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_cleaning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_registration_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_bot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON staff_line_mapping FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON line_notifications FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON line_cleaning_tasks FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON line_registration_codes FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON line_bot_config FOR ALL USING (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_staff_line_mapping_updated_at
    BEFORE UPDATE ON staff_line_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_line_bot_config_updated_at
    BEFORE UPDATE ON line_bot_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Generate a random registration code
CREATE OR REPLACE FUNCTION generate_line_registration_code(p_user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_code VARCHAR(10);
BEGIN
    -- Generate 6-character code
    v_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
    
    -- Delete any existing unused codes for this user
    DELETE FROM line_registration_codes 
    WHERE user_id = p_user_id AND used_at IS NULL;
    
    -- Insert new code with 24-hour expiry
    INSERT INTO line_registration_codes (user_id, code, expires_at)
    VALUES (p_user_id, v_code, NOW() + INTERVAL '24 hours');
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Get all housekeepers who are on duty and have LINE connected
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

-- Get all technicians who are on duty and have LINE connected
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

-- Get all admins who have LINE connected
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
