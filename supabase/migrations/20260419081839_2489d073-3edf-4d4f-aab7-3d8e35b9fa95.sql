
CREATE TABLE IF NOT EXISTS public.handbooks_test1 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.handbooks_test1 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "test_select" ON public.handbooks_test1 FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
