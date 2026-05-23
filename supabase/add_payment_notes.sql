-- Add notes column to payments for audit trail
-- (used to capture reason on receipt edits, late payment notes, etc.)

ALTER TABLE resort_uat.payments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE resort_prd.payments ADD COLUMN IF NOT EXISTS notes TEXT;

NOTIFY pgrst, 'reload schema';
