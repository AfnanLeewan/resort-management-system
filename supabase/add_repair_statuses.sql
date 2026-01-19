-- Add new status values to line_cleaning_tasks table
-- Run this in Supabase SQL Editor
-- Drop the existing CHECK constraint
ALTER TABLE line_cleaning_tasks 
DROP CONSTRAINT IF EXISTS line_cleaning_tasks_status_check;
-- Add new CHECK constraint with additional statuses
ALTER TABLE line_cleaning_tasks
ADD CONSTRAINT line_cleaning_tasks_status_check 
CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'inspected', 'needs_repair', 'pending_repair_details'));