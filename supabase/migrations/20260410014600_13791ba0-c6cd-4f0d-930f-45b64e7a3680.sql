-- Drop the FK constraint that references a UUID column
ALTER TABLE public.refund_records DROP CONSTRAINT IF EXISTS refund_records_client_id_fkey;

-- Change client_id from uuid to text
ALTER TABLE public.refund_records ALTER COLUMN client_id TYPE text USING client_id::text;