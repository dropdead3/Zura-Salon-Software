
-- Layer 1: Service-level deposit configuration
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS requires_deposit BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_type TEXT NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deposit_amount_flat NUMERIC DEFAULT NULL;

-- Layer 2: Client card-on-file storage
CREATE TABLE IF NOT EXISTS public.client_cards_on_file (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.phorest_clients(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_cards_on_file ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view cards"
  ON public.client_cards_on_file FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert cards"
  ON public.client_cards_on_file FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update cards"
  ON public.client_cards_on_file FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete cards"
  ON public.client_cards_on_file FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_client_cards_org ON public.client_cards_on_file(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_cards_client ON public.client_cards_on_file(client_id);

-- Layer 3: Deposit tracking on appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deposit_collected_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deposit_stripe_payment_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deposit_applied_to_total BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.phorest_appointments
  ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deposit_collected_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deposit_stripe_payment_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deposit_applied_to_total BOOLEAN NOT NULL DEFAULT false;
