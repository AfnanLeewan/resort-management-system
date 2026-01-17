-- ==============================================================================
-- FIX MISSING INVENTORY TABLES
-- Run this entire script in your Supabase SQL Editor to fix potential "Table not found" errors.
-- ==============================================================================

-- 1. Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create the missing ENUM (if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('in', 'out');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    min_level INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
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

-- 5. Enable Security
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- 6. Add Access Policies (Allow all operations)
DO $$ BEGIN
    CREATE POLICY "Allow all for authenticated users" ON inventory_items FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow all for authenticated users" ON inventory_transactions FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. Add Index
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);

-- 8. Setup Auto-update for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Force Supabase to refresh its schema cache
NOTIFY pgrst, 'reload schema';
D