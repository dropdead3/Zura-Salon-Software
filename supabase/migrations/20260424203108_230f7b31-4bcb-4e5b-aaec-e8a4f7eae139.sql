-- Fix S7f cursor: NULL branch_id was being treated as distinct by the
-- UNIQUE constraint, so every page of the GLOBAL pass inserted a new row
-- instead of updating in place. Use a functional unique index with COALESCE
-- so NULL collapses to the 'GLOBAL' sentinel.

ALTER TABLE public.phorest_sync_cursor
  DROP CONSTRAINT IF EXISTS phorest_sync_cursor_unique;

-- Drop any duplicate cursor rows, keeping the most-recently-updated per pass.
DELETE FROM public.phorest_sync_cursor a
USING public.phorest_sync_cursor b
WHERE a.sync_type = b.sync_type
  AND COALESCE(a.branch_id, 'GLOBAL') = COALESCE(b.branch_id, 'GLOBAL')
  AND a.updated_at < b.updated_at;

CREATE UNIQUE INDEX IF NOT EXISTS phorest_sync_cursor_unique_pass
  ON public.phorest_sync_cursor (sync_type, COALESCE(branch_id, 'GLOBAL'));