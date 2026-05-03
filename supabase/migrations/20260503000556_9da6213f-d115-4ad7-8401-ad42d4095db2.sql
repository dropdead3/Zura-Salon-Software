ALTER TABLE public.recovery_tasks
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz,
  ADD COLUMN IF NOT EXISTS snoozed_by uuid,
  ADD COLUMN IF NOT EXISTS snooze_reason text;

CREATE INDEX IF NOT EXISTS idx_recovery_tasks_snoozed
  ON public.recovery_tasks (organization_id, snoozed_until)
  WHERE snoozed_until IS NOT NULL;