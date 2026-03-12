
-- operational_tasks: org-scoped actionable work items
CREATE TABLE IF NOT EXISTS public.operational_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,

  -- What
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'open',

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_role TEXT,
  assigned_at TIMESTAMPTZ,

  -- Timing
  due_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  escalation_level INTEGER NOT NULL DEFAULT 0,

  -- Source linkage
  source_type TEXT NOT NULL,
  source_id UUID,
  source_rule TEXT,

  -- Entity linkage
  reference_type TEXT,
  reference_id UUID,

  -- Resolution
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolution_action TEXT,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_tasks ENABLE ROW LEVEL SECURITY;

-- Org members can read
CREATE POLICY "Org members can view operational tasks"
  ON public.operational_tasks FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Org admins or assigned user can update
CREATE POLICY "Assigned user or admin can update operational tasks"
  ON public.operational_tasks FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = assigned_to
    OR public.is_org_admin(auth.uid(), organization_id)
  )
  WITH CHECK (
    auth.uid() = assigned_to
    OR public.is_org_admin(auth.uid(), organization_id)
  );

-- Org members can insert (service layer creates tasks)
CREATE POLICY "Org members can create operational tasks"
  ON public.operational_tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_operational_tasks_org_status
  ON public.operational_tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_operational_tasks_org_type
  ON public.operational_tasks(organization_id, task_type);
CREATE INDEX IF NOT EXISTS idx_operational_tasks_assigned
  ON public.operational_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_operational_tasks_source
  ON public.operational_tasks(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_operational_tasks_due
  ON public.operational_tasks(due_at)
  WHERE status IN ('open', 'assigned', 'in_progress', 'blocked');

-- Updated_at trigger
CREATE TRIGGER update_operational_tasks_updated_at
  BEFORE UPDATE ON public.operational_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

-- operational_task_history: audit trail for task lifecycle
CREATE TABLE IF NOT EXISTS public.operational_task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.operational_tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  previous_assigned_to UUID,
  new_assigned_to UUID,
  performed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_task_history ENABLE ROW LEVEL SECURITY;

-- Read via parent task org membership
CREATE POLICY "Org members can view task history"
  ON public.operational_task_history FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.operational_tasks t
    WHERE t.id = task_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ));

-- Insert allowed for org members (via service)
CREATE POLICY "Org members can insert task history"
  ON public.operational_task_history FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.operational_tasks t
    WHERE t.id = task_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ));

CREATE INDEX IF NOT EXISTS idx_operational_task_history_task
  ON public.operational_task_history(task_id);
