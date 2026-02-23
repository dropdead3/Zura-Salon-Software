-- Step 1: Add missing tip/tax columns to transaction tables
ALTER TABLE phorest_sales_transactions ADD COLUMN IF NOT EXISTS tip_amount NUMERIC DEFAULT 0;
ALTER TABLE phorest_transaction_items ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
ALTER TABLE phorest_transaction_items ADD COLUMN IF NOT EXISTS tip_amount NUMERIC DEFAULT 0;