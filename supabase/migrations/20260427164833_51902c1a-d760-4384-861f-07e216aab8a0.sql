
-- Audit log for owner-authored dashboard role layouts.
-- Captures every change to dashboard_role_layouts so owners can answer
-- "who changed the manager dashboard last Tuesday?" without engineering help.

CREATE TABLE IF NOT EXISTS public.dashboard_role_layout_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  changed_by uuid,                                  -- auth.uid() when known
  previous_layout jsonb,
  new_layout jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drl_audit_org_role_time
  ON public.dashboard_role_layout_audit (organization_id, role, created_at DESC);

ALTER TABLE public.dashboard_role_layout_audit ENABLE ROW LEVEL SECURITY;

-- Owners + platform users can read the audit trail. Inserts are trigger-only;
-- no client-side INSERT/UPDATE/DELETE policy exists by design.
CREATE POLICY "owners_read_layout_audit"
  ON public.dashboard_role_layout_audit
  FOR SELECT
  TO authenticated
  USING (
    public.is_org_primary_owner(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

-- Trigger function: SECURITY DEFINER so it can write even though the calling
-- user has no INSERT policy on the audit table.
CREATE OR REPLACE FUNCTION public.log_dashboard_role_layout_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.dashboard_role_layout_audit
      (organization_id, role, action, changed_by, previous_layout, new_layout)
    VALUES
      (NEW.organization_id, NEW.role, 'insert', NEW.updated_by, NULL, NEW.layout);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Skip no-op writes (same JSONB payload).
    IF OLD.layout IS DISTINCT FROM NEW.layout THEN
      INSERT INTO public.dashboard_role_layout_audit
        (organization_id, role, action, changed_by, previous_layout, new_layout)
      VALUES
        (NEW.organization_id, NEW.role, 'update', NEW.updated_by, OLD.layout, NEW.layout);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.dashboard_role_layout_audit
      (organization_id, role, action, changed_by, previous_layout, new_layout)
    VALUES
      (OLD.organization_id, OLD.role, 'delete', auth.uid(), OLD.layout, NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_dashboard_role_layout_audit ON public.dashboard_role_layouts;
CREATE TRIGGER trg_dashboard_role_layout_audit
AFTER INSERT OR UPDATE OR DELETE ON public.dashboard_role_layouts
FOR EACH ROW EXECUTE FUNCTION public.log_dashboard_role_layout_change();
