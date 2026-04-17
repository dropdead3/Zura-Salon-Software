-- Drop existing tables (created earlier this session, no production data)
DROP TABLE IF EXISTS public.client_callbacks CASCADE;
DROP TABLE IF EXISTS public.client_about_facts CASCADE;

-- Recreate client_about_facts with TEXT client_id
CREATE TABLE public.client_about_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('pronouns','family','pets','profession','hobbies','dietary','sensitivities','custom')),
  label TEXT,
  value TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_about_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view about facts"
  ON public.client_about_facts FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert about facts"
  ON public.client_about_facts FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update about facts"
  ON public.client_about_facts FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can delete about facts"
  ON public.client_about_facts FOR DELETE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_client_about_facts_org_client
  ON public.client_about_facts(organization_id, client_id);

CREATE TRIGGER update_client_about_facts_updated_at
  BEFORE UPDATE ON public.client_about_facts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Recreate client_callbacks with TEXT client_id
CREATE TABLE public.client_callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  trigger_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  outcome_note TEXT,
  archived_reason TEXT CHECK (archived_reason IN ('acknowledged','stale','manual'))
);

ALTER TABLE public.client_callbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view callbacks"
  ON public.client_callbacks FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert callbacks"
  ON public.client_callbacks FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update callbacks"
  ON public.client_callbacks FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can delete callbacks"
  ON public.client_callbacks FOR DELETE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_client_callbacks_org_client_ack
  ON public.client_callbacks(organization_id, client_id, acknowledged_at);