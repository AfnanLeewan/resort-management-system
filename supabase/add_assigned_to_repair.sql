-- Add assigned_to column to maintenance_reports
ALTER TABLE maintenance_reports 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_assigned_to ON maintenance_reports(assigned_to);
