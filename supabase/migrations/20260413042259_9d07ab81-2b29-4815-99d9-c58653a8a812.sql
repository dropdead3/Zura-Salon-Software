-- Add Stripe Connect Express columns to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT NOT NULL DEFAULT 'not_connected';

-- Org admins can read their own org's connect status (already covered by existing RLS on organizations)