-- S7f: Resumable client sync cursor.
-- Tracks per-tenant progress across invocations so the 3,881-client pull
-- can complete across multiple ~120s function runs instead of being lost
-- to the 150s gateway timeout each time.
CREATE TABLE IF NOT EXISTS public.phorest_sync_cursor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL,
  -- NULL branch_id = global tenant pass; non-null = per-branch pass
  branch_id TEXT,
  branch_name TEXT,
  region TEXT,
  -- Pagination state
  last_completed_page INTEGER NOT NULL DEFAULT -1,
  total_pages INTEGER,
  total_elements INTEGER,
  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | complete | failed
  records_pulled INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  -- Run tracking
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  -- One row per (sync_type, branch_id) pass; NULL branch_id treated as 'GLOBAL'
  CONSTRAINT phorest_sync_cursor_unique UNIQUE (sync_type, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_phorest_sync_cursor_status
  ON public.phorest_sync_cursor (sync_type, status);

ALTER TABLE public.phorest_sync_cursor ENABLE ROW LEVEL SECURITY;

-- Internal infrastructure table — only platform/admin roles can read it.
-- Writes happen exclusively from the edge function with the service role,
-- which bypasses RLS.
CREATE POLICY "Platform users can view sync cursors"
  ON public.phorest_sync_cursor
  FOR SELECT
  TO authenticated
  USING (public.is_platform_user(auth.uid()));

CREATE TRIGGER set_phorest_sync_cursor_updated_at
  BEFORE UPDATE ON public.phorest_sync_cursor
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();