

# Per-Location Backroom Entitlements

## Problem

Currently Backroom is gated at the **organization level** only (`organization_feature_flags.backroom_enabled`). But the business model prices Backroom per-location (plans include scale counts, and backroom settings/stations already support location-level scoping). There's no way for platform admins to activate Backroom for specific locations within an org, and orgs can't subscribe per-location.

## Architecture Change

Introduce a `backroom_location_entitlements` table that tracks which specific locations within an org have Backroom activated, their plan tier, scale allocation, and trial status. The org-level `backroom_enabled` flag becomes the **master switch** (org must have it enabled), while individual locations get their own entitlement rows.

```text
Organization (backroom_enabled = true)  ← master switch
  ├── Location A  → backroom_location_entitlements row (active, professional, 2 scales)
  ├── Location B  → backroom_location_entitlements row (trial, starter, 1 scale)
  └── Location C  → no row = Backroom not active here
```

## Database Migration

New table: `backroom_location_entitlements`

```sql
CREATE TABLE public.backroom_location_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL DEFAULT 'starter',          -- starter | professional | unlimited
  scale_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',              -- active | trial | cancelled | suspended
  trial_end_date TIMESTAMPTZ,
  billing_interval TEXT DEFAULT 'monthly',            -- monthly | annual
  stripe_subscription_id TEXT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, location_id)
);

ALTER TABLE public.backroom_location_entitlements ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all rows
CREATE POLICY "Platform admins manage location entitlements"
  ON public.backroom_location_entitlements FOR ALL
  USING (public.has_platform_role(auth.uid()));

-- Org members can read their own org's entitlements
CREATE POLICY "Org members read own entitlements"
  ON public.backroom_location_entitlements FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- Org admins can manage their own org's entitlements
CREATE POLICY "Org admins manage own entitlements"
  ON public.backroom_location_entitlements FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));
```

## Frontend Changes

### 1. New hook: `useBackroomLocationEntitlements`
- Fetches all location entitlements for the current org
- Provides `isLocationEntitled(locationId)` helper
- Used alongside existing `useBackroomEntitlement` (org-level check remains)

### 2. Update `useBackroomEntitlement`
- Add optional `locationId` parameter
- When provided, checks **both** org-level flag AND location entitlement row
- Backward-compatible: without locationId, behaves as today

### 3. Platform Admin — Entitlements Tab (`BackroomEntitlementsTab.tsx`)
- Add expandable org rows showing **each location** within the org
- Per-location: toggle active/inactive, set plan tier, scale count, trial status
- Summary row shows "3 of 5 locations active" instead of just org-level toggle
- Bulk enable/disable locations within an org

### 4. Paywall — Location Selection (`BackroomPaywall.tsx`)
- After plan selection, show location picker: "Which locations need Backroom?"
- Checkboxes for each active location in the org
- Price summary updates: `$79/mo × 3 locations = $237/mo`
- Scale configurator becomes per-location or total across selected locations
- Checkout metadata includes selected `location_ids`

### 5. Stripe Webhook Update (`stripe-webhook/index.ts`)
- `handleBackroomCheckoutCompleted`: read `location_ids` from metadata, insert rows into `backroom_location_entitlements` for each
- `handleSubscriptionDeleted`: set status to `cancelled` for affected location rows

### 6. Backroom Settings Gate
- Where backroom features filter by location (stations, analytics, settings), add entitlement check for that specific location
- Show "Backroom not activated for this location" message when accessing an un-entitled location

## Files to Create/Modify

| File | Action |
|------|--------|
| **Migration SQL** | Create `backroom_location_entitlements` table + RLS |
| `src/hooks/backroom/useBackroomLocationEntitlements.ts` | New — fetch + helpers |
| `src/hooks/backroom/useBackroomEntitlement.ts` | Add optional `locationId` param |
| `src/components/platform/backroom/BackroomEntitlementsTab.tsx` | Per-location management UI |
| `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` | Location picker in checkout flow |
| `supabase/functions/stripe-webhook/index.ts` | Write per-location entitlement rows |

