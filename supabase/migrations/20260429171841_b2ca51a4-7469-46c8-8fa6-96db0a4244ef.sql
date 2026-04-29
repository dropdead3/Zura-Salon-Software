-- Team member archive lifecycle
ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS archive_reason text,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_by uuid,
  ADD COLUMN IF NOT EXISTS last_day_worked date;

CREATE INDEX IF NOT EXISTS idx_employee_profiles_archived
  ON public.employee_profiles(organization_id, archived_at);

CREATE TABLE IF NOT EXISTS public.team_member_archive_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  archived_by uuid NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  effective_date date,
  reassignment_ledger jsonb NOT NULL DEFAULT '[]'::jsonb,
  unarchived_at timestamptz,
  unarchived_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_archive_log_org
  ON public.team_member_archive_log(organization_id, archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_archive_log_user
  ON public.team_member_archive_log(user_id);

ALTER TABLE public.team_member_archive_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "archive_log_member_read" ON public.team_member_archive_log;
CREATE POLICY "archive_log_member_read"
  ON public.team_member_archive_log
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "archive_log_admin_write" ON public.team_member_archive_log;
CREATE POLICY "archive_log_admin_write"
  ON public.team_member_archive_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "archive_log_admin_update" ON public.team_member_archive_log;
CREATE POLICY "archive_log_admin_update"
  ON public.team_member_archive_log
  FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));