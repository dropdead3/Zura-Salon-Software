

# Per-Location Stripe Connect Accounts (Multi-LLC Support)

## Current Architecture

Today, Zura Pay uses a **single Stripe Connect Express account per organization**. When a location is "connected," it simply copies the org-level `stripe_connect_account_id` onto the `locations.stripe_account_id` column. All locations share the same bank account and payout schedule.

This breaks for multi-location operators where each location is a separate LLC with its own EIN and business checking account.

## Proposed Architecture: Per-Location Connect Accounts

Each location gets its own Stripe Connect Express account. The org-level account becomes optional (or used as a default for locations that don't need separation).

### Data Changes

| Change | Detail |
|--------|--------|
| `locations` table | `stripe_account_id` becomes the **canonical** Connect account for that location (already exists). Add `stripe_connect_status` column (enum: `not_connected`, `pending`, `active`) to track per-location onboarding independently. |
| `organizations` table | `stripe_connect_account_id` and `stripe_connect_status` remain as the **org-level default**. Locations without their own account inherit this. |
| Resolution logic | All payment functions resolve the Connect account via: `location.stripe_account_id ?? organization.stripe_connect_account_id`. This is a single-line change per function. |

### Edge Function Changes

| Function | Change |
|----------|--------|
| `connect-zura-pay` | New action `create_location_account` — creates a Stripe Express account scoped to a specific location (using that location's name/address for the account). Stores the account ID on `locations.stripe_account_id` and sets `locations.stripe_connect_status = 'pending'`. |
| `connect-zura-pay` | Update `connect_location` — if location already has its own `stripe_account_id`, skip copying from org. |
| `create-terminal-payment-intent` | Change account lookup: prefer `locations.stripe_account_id` for the appointment's location, fall back to `organizations.stripe_connect_account_id`. |
| `zura-pay-payouts` | Support querying payouts per-location (by location's own Connect account) in addition to org-level. |
| All payment functions | Standardize a shared `resolveConnectAccount(orgId, locationId)` helper. |

### UI Changes

| Surface | Change |
|---------|--------|
| Fleet Tab — Location Card | Add a toggle/option: "Use organization account" vs "Connect separate account". When "separate" is chosen, show a "Start Onboarding" button that creates a location-specific Express account. |
| Fleet Tab — Location Card | Show per-location onboarding status independently (pending/active). |
| Payouts Tab | Add a location filter so owners can view payouts per-location when locations have separate accounts. |
| Activation Checklist | Update step logic: location is "connected" when it has *any* active Connect account (own or inherited from org). |

### Resolution Chain (Non-Negotiable)

```text
Payment Request for Location X
  → locations.stripe_account_id (location's own Express account)
  → organizations.stripe_connect_account_id (org default)
  → Error: "No payment account configured"
```

This mirrors the existing override hierarchy pattern used for commission rates and KPI thresholds (Location Override → Organization Default).

### Migration Path

- Existing orgs with a single Connect account continue working unchanged — locations inherit the org account.
- No data migration needed. New columns default to `not_connected` / `null`.
- Owners opt-in per-location when they need LLC separation.

### Security Considerations

- Each location's Express account onboarding requires org admin permission (same as today).
- Per-location accounts are still scoped under the org's platform account — no cross-tenant exposure.
- Payouts for a location's account go to that location's configured bank — Stripe enforces this at the account level.

### Files to Create/Modify

| File | Action |
|------|--------|
| DB migration | Add `stripe_connect_status` to `locations` table (default `'not_connected'`) |
| `connect-zura-pay/index.ts` | Add `create_location_account` action; update `connect_location` logic |
| `create-terminal-payment-intent/index.ts` | Use location-first account resolution |
| `charge-card-on-file/index.ts` | Same resolution change |
| `collect-booking-deposit/index.ts` | Same resolution change |
| `process-stripe-refund/index.ts` | Same resolution change |
| `zura-pay-payouts/index.ts` | Support per-location payout queries |
| `useZuraPayConnect.ts` | Add `useCreateLocationAccount` mutation |
| `ZuraPayFleetTab.tsx` | Per-location account toggle and onboarding UI |
| `ZuraPayActivationChecklist.tsx` | Update connection check logic |

### What This Does NOT Change

- Single-location orgs: zero behavior change.
- Orgs happy with one bank account: zero behavior change.
- The existing org-level onboarding flow remains the default path.

This is additive — multi-LLC support layered on top of the current architecture.

