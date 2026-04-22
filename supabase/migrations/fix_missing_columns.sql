-- Bug 1 & 2: Add missing room_guests column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_guests JSONB;

-- Bug 3: Fix FK constraint on inventory_transactions to allow item deletion
ALTER TABLE inventory_transactions ALTER COLUMN item_id DROP NOT NULL;
ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_item_id_fkey;
ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE SET NULL;
