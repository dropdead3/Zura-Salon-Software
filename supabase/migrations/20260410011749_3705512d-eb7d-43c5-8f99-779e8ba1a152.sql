CREATE TABLE IF NOT EXISTS public.voided_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  transaction_id text NOT NULL,
  void_reason text,
  voided_by uuid NOT NULL REFERENCES auth.users(id),
  voided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, transaction_id)
);

ALTER TABLE public.voided_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view voided transactions"
  ON public.voided_transactions FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can void transactions"
  ON public.voided_transactions FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_voided_transactions_org
  ON public.voided_transactions(organization_id);

CREATE INDEX IF NOT EXISTS idx_voided_transactions_txn
  ON public.voided_transactions(transaction_id);