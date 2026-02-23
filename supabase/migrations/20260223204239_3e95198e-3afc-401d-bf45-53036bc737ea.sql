
-- 1. Create shared sequence
CREATE SEQUENCE IF NOT EXISTS public.client_customer_number_seq START WITH 1 INCREMENT BY 1;

-- 2. Add customer_number column to both tables
ALTER TABLE public.phorest_clients ADD COLUMN IF NOT EXISTS customer_number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS customer_number TEXT;

-- 3. Add unique constraints
ALTER TABLE public.phorest_clients ADD CONSTRAINT phorest_clients_customer_number_key UNIQUE (customer_number);
ALTER TABLE public.clients ADD CONSTRAINT clients_customer_number_key UNIQUE (customer_number);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_phorest_clients_customer_number ON public.phorest_clients (customer_number);
CREATE INDEX IF NOT EXISTS idx_clients_customer_number ON public.clients (customer_number);

-- 5. Create trigger function
CREATE OR REPLACE FUNCTION public.generate_customer_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.customer_number IS NULL THEN
    NEW.customer_number := 'ZU-' || lpad(nextval('public.client_customer_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Create triggers on both tables
CREATE TRIGGER trg_generate_customer_number_phorest
  BEFORE INSERT ON public.phorest_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_customer_number();

CREATE TRIGGER trg_generate_customer_number_clients
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_customer_number();

-- 7. Backfill phorest_clients ordered by created_at
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) as rn
  FROM public.phorest_clients
  WHERE customer_number IS NULL
)
UPDATE public.phorest_clients pc
SET customer_number = 'ZU-' || lpad(n.rn::text, 5, '0')
FROM numbered n
WHERE pc.id = n.id;

-- 8. Advance sequence past phorest backfill, then backfill clients
DO $$
DECLARE
  max_num INTEGER;
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(customer_number, '^ZU-', ''), '')::integer), 0)
  INTO max_num
  FROM public.phorest_clients
  WHERE customer_number IS NOT NULL;

  -- Set sequence to max_num so next call starts at max_num+1
  IF max_num > 0 THEN
    PERFORM setval('public.client_customer_number_seq', max_num);
  END IF;

  -- Now backfill clients table using nextval
  UPDATE public.clients
  SET customer_number = 'ZU-' || lpad(nextval('public.client_customer_number_seq')::text, 5, '0')
  WHERE customer_number IS NULL;
END;
$$;
