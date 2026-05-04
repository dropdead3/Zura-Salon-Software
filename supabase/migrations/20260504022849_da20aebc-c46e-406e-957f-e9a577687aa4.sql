-- Third-party reputation platform OAuth connections (Google / Facebook).
-- OAuth flow + sync edge functions are intentionally deferred (P2.1 / P2.2 of
-- the build plan). Table + RLS land first so the UI can render
-- "Not connected / Connect" affordances without scaffolding being a blocker.

CREATE TYPE public.review_platform AS ENUM ('google', 'facebook');

CREATE TYPE public.review_connection_status AS ENUM (
  'pending',     -- OAuth started, callback not yet completed
  'active',      -- tokens valid, syncing
  'expired',     -- refresh token gone, needs re-auth
  'revoked',     -- user revoked at provider
  'error'        -- last sync errored, see last_error
);

CREATE TABLE public.review_platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,                          -- nullable = org-wide connection
  platform public.review_platform NOT NULL,
  status public.review_connection_status NOT NULL DEFAULT 'pending',

  -- Identity at the provider
  external_account_id TEXT,                   -- e.g. GBP location name or FB Page ID
  external_account_label TEXT,                -- human-readable

  -- OAuth material. TODO (deferred): move to Vault once edge fn lands.
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],

  -- Sync state
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  cached_review_count INTEGER,
  cached_average_rating NUMERIC(3,2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- One active-or-pending connection per (org, location, platform)
  UNIQUE (organization_id, location_id, platform)
);

CREATE INDEX idx_rpc_org_platform
  ON public.review_platform_connections (organization_id, platform);
CREATE INDEX idx_rpc_status_synced
  ON public.review_platform_connections (status, last_synced_at)
  WHERE status = 'active';

-- updated_at trigger (reuses existing helper)
CREATE TRIGGER trg_rpc_updated_at
BEFORE UPDATE ON public.review_platform_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: tenant-scoped; mutations restricted to admins/owners.
ALTER TABLE public.review_platform_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their connections"
  ON public.review_platform_connections
  FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create connections"
  ON public.review_platform_connections
  FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update connections"
  ON public.review_platform_connections
  FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete connections"
  ON public.review_platform_connections
  FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));