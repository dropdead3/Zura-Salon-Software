-- 1. Schema delta on review_platform_connections
ALTER TABLE public.review_platform_connections
  ADD COLUMN IF NOT EXISTS place_id text,
  ADD COLUMN IF NOT EXISTS google_account_id text,
  ADD COLUMN IF NOT EXISTS connected_by_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_rpc_org_location_active
  ON public.review_platform_connections(organization_id, location_id, platform)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_rpc_place_id
  ON public.review_platform_connections(place_id)
  WHERE place_id IS NOT NULL;

COMMENT ON COLUMN public.review_platform_connections.place_id IS
  'Canonical Google Place ID for this location. Source of truth for review URLs when present; falls back to manual google_review_url on location_review_links.';
COMMENT ON COLUMN public.review_platform_connections.google_account_id IS
  'Parent GBP account id (one per Google login, may own multiple locations). Used for token-grant deduplication.';
COMMENT ON COLUMN public.review_platform_connections.last_verified_at IS
  'Timestamp of the most recent accounts.locations.get probe. Drives the 24h suspension/merge detection cron.';

-- 2. Short-lived staging table for the GBP picker round-trip
CREATE TABLE IF NOT EXISTS public.oauth_pending_mappings (
  nonce uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'google',
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_pending_mappings_org_user
  ON public.oauth_pending_mappings(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_pending_mappings_expires
  ON public.oauth_pending_mappings(expires_at);

ALTER TABLE public.oauth_pending_mappings ENABLE ROW LEVEL SECURITY;

-- Service-role only — no policies for authenticated users. Edge functions use service role.
COMMENT ON TABLE public.oauth_pending_mappings IS
  'Service-role only. Holds Google tokens + discovered GBP locations between OAuth callback and the mapping picker. Auto-expires after 15min; cron purge runs hourly.';

-- 3. Per-location action helper (today only org admins; stylist-location assignment deferred)
CREATE OR REPLACE FUNCTION public.user_can_act_on_location(
  _user_id uuid,
  _org_id uuid,
  _location_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- TODO: when user_location_assignments lands, OR-extend with:
  --   EXISTS (SELECT 1 FROM user_location_assignments
  --     WHERE user_id = _user_id AND organization_id = _org_id AND location_id = _location_id)
  -- Until then, only org admins can act on individual locations.
  SELECT public.is_org_admin(_user_id, _org_id);
$$;

COMMENT ON FUNCTION public.user_can_act_on_location IS
  'Authorization gate for per-location reputation mutations (reply-to-review, location-scoped disconnect). Currently org-admin only; extend when stylist-level location assignment ships.';

-- 4. Hourly cron purge of expired staging rows
CREATE OR REPLACE FUNCTION public.purge_expired_oauth_mappings()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.oauth_pending_mappings WHERE expires_at < now();
$$;