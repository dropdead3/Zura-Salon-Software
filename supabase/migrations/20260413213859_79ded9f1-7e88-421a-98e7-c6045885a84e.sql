
-- Create staff_payout_accounts table
CREATE TABLE IF NOT EXISTS public.staff_payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  stripe_account_id TEXT NOT NULL,
  stripe_status TEXT NOT NULL DEFAULT 'pending',
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  details_submitted BOOLEAN NOT NULL DEFAULT false,
  bank_last4 TEXT,
  bank_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.staff_payout_accounts ENABLE ROW LEVEL SECURITY;

-- Staff can view their own row
CREATE POLICY "Staff can view own payout account"
  ON public.staff_payout_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Org admins can view all in org
CREATE POLICY "Org admins can view all payout accounts"
  ON public.staff_payout_accounts FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Org admins can insert
CREATE POLICY "Org admins can create payout accounts"
  ON public.staff_payout_accounts FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Org admins can update
CREATE POLICY "Org admins can update payout accounts"
  ON public.staff_payout_accounts FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_staff_payout_accounts_updated_at
  BEFORE UPDATE ON public.staff_payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_payout_accounts_org
  ON public.staff_payout_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_payout_accounts_user
  ON public.staff_payout_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_payout_accounts_stripe
  ON public.staff_payout_accounts(stripe_account_id);

-- Also add paid_at column to tip_distributions for tracking payout time
ALTER TABLE public.tip_distributions ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.tip_distributions ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;
