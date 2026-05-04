## GBP ↔ Location Federation for Reputation

Refactor Google Business Profile connections from **org-scoped (one connection per org)** to **location-scoped (one connection per location)**, add a GBP picker step to the OAuth callback so operators map each profile they own to a Zura location, and surface per-location OAuth health.

### Current state (verified)

- `review_platform_connections` already has a `location_id text` column AND a UNIQUE `(organization_id, location_id, platform)` constraint — but every code path writes `location_id: null`, so the schema is multi-location-ready and the *behavior* isn't.
- `reputation-google-oauth-callback` upserts a single org-scoped row (`location_id: null`) and never asks Google which GBPs the token can see.
- `PlatformConnectorTile` looks up `connections.find(c => c.platform === 'google')` — first match wins, no location awareness.
- `useReviewPlatformConnections` returns the flat list, no location grouping.
- `location_review_links` already stores per-location `google_review_url` (manual paste) — this becomes the **fallback** when no OAuth row exists for that location.

So the database is mostly there. The work is in the OAuth flow, the picker UI, the consumer hooks, and a new health surface.

---

### Scope

**In scope**
1. Schema delta: add `place_id`, `connected_by_user_id`, `last_verified_at` columns.
2. OAuth callback rewrite: after token exchange, fetch the operator's Google Business accounts + locations via the My Business Account Management API, store the token in a **staging row**, and redirect to a new `/admin/feedback/connect-google` mapping page.
3. New mapping page: operator picks "this GBP → this Zura location" for each location they want to wire (1:1, can leave blanks). Multi-select submit creates one `review_platform_connections` row per mapped location, each carrying its own `place_id` + a copy of the same access/refresh token (since one Google account can manage multiple locations).
4. `PlatformConnectorTile` becomes location-aware: filters by `(platform, location_id)`. Online Presence tab grows a per-location accordion when org has >1 location.
5. New `useGBPHealth(orgId)` hook + `<ReputationOAuthGraceBanner />` mounted in `DashboardLayout` — shows "X of Y locations need Google reconnect" with deep-link to the offending location's tile.
6. Stylist Privacy Contract: reply mutations (when shipped) gate on `location_id ∈ user.allowed_locations`, not just `is_org_member`.
7. Memory updates: extend `mem://features/reputation-engine.md` with the federation contract; cross-link to Multi-LLC Payment Governance.

**Out of scope (deferred, logged in memory Deferral Register)**
- Multi-Google-account-per-org (different LLC owners). Today: one Google account, mapped to N locations. Multi-account = next wave.
- Multiple GBPs per single location (the previous question's case). Still deferred.
- Founder-offboarding service-account handoff flow.

---

### Schema delta

```sql
ALTER TABLE review_platform_connections
  ADD COLUMN place_id text,
  ADD COLUMN google_account_id text,
  ADD COLUMN connected_by_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN last_verified_at timestamptz;

CREATE INDEX idx_rpc_org_location_platform
  ON review_platform_connections(organization_id, location_id, platform)
  WHERE status = 'active';

-- Backfill: existing org-scoped rows (location_id IS NULL) become "unmapped"
-- and surface in the new banner with a one-click "finish mapping" CTA.
```

`place_id` is the canonical Google Place ID. `google_account_id` is the parent GBP account (one per Google login, may own many locations). `last_verified_at` is bumped by a daily cron that calls `accounts.locations.get` to detect suspensions/merges.

### OAuth flow

```text
operator clicks Connect Google
  → reputation-google-oauth-initiate (unchanged)
  → Google consent
  → reputation-google-oauth-callback (REWRITTEN)
      ├─ verify state
      ├─ exchange code for tokens
      ├─ fetch userinfo
      ├─ fetch GBP accounts: GET mybusinessaccountmanagement/v1/accounts
      ├─ for each account: GET mybusinessbusinessinformation/v1/{account}/locations
      ├─ stash {token, refresh, account_id, locations[]} in a short-lived
      │   `oauth_pending_mappings` table keyed by signed nonce
      └─ redirect to /admin/feedback/connect-google?nonce=...
  → Mapping page (new)
      ├─ shows table: [Zura location] × [GBP dropdown] for every active location
      ├─ pre-selects best match by name similarity
      ├─ on submit: edge fn `reputation-google-finalize-mapping`
      │   inserts one review_platform_connections row per mapped location
      └─ redirects back to /admin/feedback?google_connected=N
```

`oauth_pending_mappings`:
```sql
CREATE TABLE oauth_pending_mappings (
  nonce uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  payload jsonb NOT NULL,  -- {access_token, refresh_token, expires_at, google_account_id, locations: [{place_id, name, address}]}
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes'
);
ALTER TABLE oauth_pending_mappings ENABLE ROW LEVEL SECURITY;
-- No RLS policies — service role only. Cron purges expired rows hourly.
```

### New edge functions

- `reputation-google-finalize-mapping` — JWT-validated, accepts `{ nonce, mappings: [{location_id, place_id, gbp_label}] }`, writes N rows to `review_platform_connections`, deletes the staging row.
- `reputation-google-verify-locations` — daily cron, iterates active connections, calls `accounts.locations.get(place_id)`, sets `last_verified_at`, flips `status` to `'error'` with `last_error='gbp_suspended'` on 404.

### UI changes

- **`PlatformConnectorTile`** — accepts `locationId` prop, scopes the connection lookup. Falls back to org-scoped row only if no location-scoped row exists (back-compat).
- **`OnlinePresenceTab`** (in FeedbackHub) — when org has >1 location, renders a per-location accordion, each containing the Google/Apple/Facebook tile trio. Single-location orgs see today's flat layout.
- **`/admin/feedback/connect-google`** — new page (rendered inside DashboardLayout, hub back-link to `/admin/feedback`), table-driven mapping UI using `tokens.table.*`. Submit button disabled until at least one mapping is selected.
- **`<ReputationOAuthGraceBanner />`** — mounted in `DashboardLayout` next to the existing subscription grace banner. Shows when `useGBPHealth` reports `expired_count + revoked_count > 0`. Deep-links to `/admin/feedback?reconnect=<location_id>` which auto-scrolls and highlights the affected tile.

### Stylist Privacy Contract enforcement

All future write actions on a connection (reply-to-review, refresh-token, disconnect) MUST gate on `location_id ∈ allowed_locations(user)` server-side, not just `is_org_admin`. Add a helper:

```sql
CREATE OR REPLACE FUNCTION user_can_act_on_location(_user_id uuid, _org_id uuid, _location_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    is_org_admin(_user_id, _org_id)
    OR EXISTS (
      SELECT 1 FROM user_location_assignments
      WHERE user_id = _user_id AND organization_id = _org_id AND location_id = _location_id
    )
$$;
```

Use it in every reputation edge function that takes a `location_id`.

### Memory updates

- Extend `mem://features/reputation-engine.md` with a **"GBP-to-Location Federation Contract"** section describing the cardinality model (1 Google account → N locations, 1:1 GBP-to-location), the staging-table pattern, and the daily verification cron.
- Add **cross-link** to `mem://features/payments/multi-llc-payment-governance.md`: "Same federation pattern as multi-LLC EIN overrides — different identity per location, single org wrapper."
- Add to Reputation **Deferral Register**:
  - Multi-Google-account-per-org (different LLC owners) → revisit when ≥1 customer reports it.
  - Multi-GBP-per-location (salon + barbershop at one address) → revisit when ≥3 customer reports.
  - Founder-offboarding service-account handoff → revisit when first founder transition occurs.

### Acceptance criteria

1. New org with 3 locations connects Google once, sees a 3-row mapping table, picks one GBP per location, lands back on Online Presence with three independent active tiles.
2. Single-location org sees the **same flow as today** — mapping page auto-submits if exactly one location + one GBP match.
3. Disconnecting Google for Location A leaves Locations B and C active; banner shows "1 of 3 locations need reconnect".
4. Daily verification cron flips a tile to "Reconnect needed" within 24h of GBP suspension.
5. Stylist user assigned only to Location B cannot trigger reconnect/disconnect for Location A (server returns 403).
6. Existing org-scoped rows (`location_id IS NULL`) display in the banner as "Finish setup" with a CTA that opens the mapping page pre-loaded from a fresh OAuth round-trip.

---

### Technical notes

- Google API quotas: My Business Business Information API has a default 300 QPM. The verification cron should batch + sleep; not a concern at current scale.
- Token storage: each location gets a **copy** of the same refresh token (Google issues one token per OAuth flow regardless of how many locations it covers). Refreshing at the per-location row keeps RLS simple; a future optimization can deduplicate via a `google_oauth_grants` table keyed by `google_account_id`.
- The mapping page is the right surface to enforce the **Hub Landings doctrine**: it's deep-linked from the OAuth callback and only that flow — not a default tab in FeedbackHub.
- `place_id` on the connection lets us derive the canonical review URL (`https://search.google.com/local/writereview?placeid=<id>`) and stop trusting hand-pasted `g.page` short links when both are present.
