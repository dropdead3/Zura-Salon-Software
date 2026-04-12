

# Zura Capital — Platform-Level Feature Toggle

## What

Add a `capital_enabled` organization feature flag, controlled from the Platform Admin's AccountAppsCard, that gates the entire Zura Capital experience per organization. For beta, only Drop Dead Salons gets it toggled on.

## How It Works

The existing `organization_feature_flags` + `useOrganizationFeatureFlags` pattern (same as Color Bar, Connect, Payroll) handles everything. No new tables needed.

### 1. Add `capital_enabled` to global feature_flags table

**Database migration:**
```sql
INSERT INTO public.feature_flags (flag_key, is_enabled, description)
VALUES ('capital_enabled', false, 'Enables Zura Capital funding engine for the organization')
ON CONFLICT (flag_key) DO NOTHING;
```

Default is `false` globally — no org gets Capital unless explicitly toggled on.

### 2. Enable for Drop Dead Salons

```sql
INSERT INTO public.organization_feature_flags (organization_id, flag_key, is_enabled, override_reason)
SELECT id, 'capital_enabled', true, 'Beta testing — initial rollout'
FROM public.organizations WHERE slug = 'drop-dead-salons'
ON CONFLICT (organization_id, flag_key) DO NOTHING;
```

### 3. Add toggle row to AccountAppsCard

**File:** `src/components/platform/account/AccountAppsCard.tsx`

Add a "Zura Capital" row matching the existing Color Bar / Connect / Payroll pattern:
- Icon: `Landmark` (amber-400)
- Description: "Growth Capital Engine"
- Badge: Active/Inactive
- Toggle via `handleToggleFlag('capital_enabled', ...)`

### 4. Gate sidebar visibility on the flag

**File:** `src/components/dashboard/SidebarNavContent.tsx`

Change the Capital visibility check from "has active opportunities" to "has `capital_enabled` flag AND has active opportunities":

```ts
// Add query for the flag
const { data: orgFlags } = useOrganizationFeatureFlags(organizationId ?? '');
const isCapitalEnabled = orgFlags?.find(f => f.flag_key === 'capital_enabled')?.org_enabled ?? false;

// Update condition
...(isCapitalEnabled && hasCapitalOpportunities ? [{ ... }] : [])
```

### 5. Gate the Capital route

**File:** `src/App.tsx`

Add a check on the Capital routes so that even direct URL access is blocked when the flag is off. Wrap the Capital route element with a feature gate check.

## Scope

| File | Change |
|---|---|
| **Migration** | Insert `capital_enabled` into `feature_flags` + enable for Drop Dead Salons |
| `AccountAppsCard.tsx` | Add Zura Capital toggle row |
| `SidebarNavContent.tsx` | Gate sidebar item on `capital_enabled` flag |
| `App.tsx` | Gate Capital routes on the flag |

## Why This Works

- Follows the exact same governance pattern as Color Bar, Connect, and Payroll
- Platform Admin has full control per organization
- Default-off globally = safe for new orgs
- Drop Dead Salons gets it immediately for beta
- No new tables, hooks, or infrastructure needed

