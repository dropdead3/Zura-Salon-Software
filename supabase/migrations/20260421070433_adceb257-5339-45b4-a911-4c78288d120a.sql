-- 1) Differentiate wizard vs backfill in commit log -----------------------
ALTER TABLE public.org_setup_commit_log
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'wizard'
    CHECK (source IN ('wizard', 'backfill', 'api'));

UPDATE public.org_setup_commit_log
   SET source = 'backfill'
 WHERE reason ILIKE 'Inferred%'
    OR (attempted_by IS NULL AND reason ILIKE '%backfill%');

CREATE INDEX IF NOT EXISTS idx_org_setup_commit_log_source
  ON public.org_setup_commit_log (organization_id, source, attempted_at DESC);

-- 2) Server-side backfill audit ledger -----------------------------------
CREATE TABLE IF NOT EXISTS public.org_setup_backfill_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attempted_by UUID,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  outcome TEXT NOT NULL CHECK (outcome IN ('backfilled', 'skipped', 'failed', 'noop')),
  backfilled_count INTEGER NOT NULL DEFAULT 0,
  pending_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_org_setup_backfill_attempts_org
  ON public.org_setup_backfill_attempts (organization_id, attempted_at DESC);

ALTER TABLE public.org_setup_backfill_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform users view backfill attempts"
  ON public.org_setup_backfill_attempts
  FOR SELECT
  TO authenticated
  USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Org admins view their backfill attempts"
  ON public.org_setup_backfill_attempts
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- 3) De-dupe outreach log inserts via generated date bucket --------------
ALTER TABLE public.setup_outreach_log
  ADD COLUMN IF NOT EXISTS exported_on_date DATE
    GENERATED ALWAYS AS ((exported_at AT TIME ZONE 'UTC')::date) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS setup_outreach_log_org_step_day_unique
  ON public.setup_outreach_log (organization_id, step_number, exported_on_date);

-- 4) Repair the cron job (P0 fix) ----------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-setup-followups') THEN
    PERFORM cron.unschedule('process-setup-followups');
  END IF;
  PERFORM cron.schedule(
    'process-setup-followups',
    '0 * * * *',
    $cmd$
      SELECT net.http_post(
        url := 'https://vciqmwzgfjxtzagaxgnh.supabase.co/functions/v1/process-setup-followups',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := '{}'::jsonb
      );
    $cmd$
  );
END $$;