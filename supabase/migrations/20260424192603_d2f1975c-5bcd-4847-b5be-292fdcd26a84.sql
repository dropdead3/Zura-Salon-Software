-- =========================================================================
-- WAVE S5: Negative Cache Decontamination & Structural Fix
-- =========================================================================

-- S5a: One-time purge of poisoned negative-cache rows from phorest_clients.
-- These were written when probes hit the wrong regional API and wrote
-- [Deleted Client] placeholders. Removing them unblocks Pass 3 re-probing.
DELETE FROM public.phorest_clients
WHERE name = '[Deleted Client]';

-- S5c: Structural extraction — dedicated negative cache table.
-- Names table holds names. Absence-signals live in their own table.
CREATE TABLE IF NOT EXISTS public.phorest_client_negative_cache (
  phorest_client_id text PRIMARY KEY,
  phorest_branch_id text,
  region text,
  first_404_at timestamptz NOT NULL DEFAULT now(),
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  confirmation_count integer NOT NULL DEFAULT 1,
  branches_probed text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phorest_client_negative_cache ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user (diagnostic-only, no PII)
CREATE POLICY "Authenticated users can view negative cache"
  ON public.phorest_client_negative_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Write: service role only (edge functions); no client-side writes.
-- (Service role bypasses RLS, so no INSERT/UPDATE/DELETE policies for users.)

CREATE INDEX IF NOT EXISTS idx_phorest_client_negative_cache_last_checked
  ON public.phorest_client_negative_cache (last_checked_at);

-- S5d: Structural enforcement gate — forbid the [Deleted Client] sentinel
-- string in the identity column. Bug class S5 cannot recur at the DB layer.
ALTER TABLE public.phorest_clients
  DROP CONSTRAINT IF EXISTS phorest_clients_name_no_sentinel;

ALTER TABLE public.phorest_clients
  ADD CONSTRAINT phorest_clients_name_no_sentinel
  CHECK (name IS NULL OR name <> '[Deleted Client]');