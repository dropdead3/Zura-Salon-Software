-- S7g: Drop the uniqueness CONSTRAINT (the previous attempt tried to
-- drop the index directly, which Postgres refuses while it backs a
-- constraint).
ALTER TABLE public.phorest_clients
  DROP CONSTRAINT IF EXISTS phorest_clients_customer_number_key;