-- Add deposit and balance_due columns to payments table
-- deposit: the advance payment collected at booking time
-- balance_due: the amount collected at checkout (total - deposit)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deposit DECIMAL(10, 2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS balance_due DECIMAL(10, 2);
