

# Auto-Connect Location When Org Account Becomes Active

## Problem
After completing Stripe Connect onboarding, the org account becomes "active" but locations still show "Not Connected." For single-location organizations, this extra manual step is unnecessary friction.

## Solution
When `verify-zura-pay-connection` detects the org status transitioning to `active`, automatically connect any locations that don't already have their own Stripe account — but only if the org has a single location (preserving multi-LLC control).

## Changes

### 1. Edge Function: `supabase/functions/verify-zura-pay-connection/index.ts`

After the status update block (line ~100), add auto-connect logic:

- When `newStatus === "active"` and the status actually changed (was not already active):
  - Query all locations for the org that have no `stripe_account_id`
  - If there is exactly 1 unconnected location (single-location setup), auto-update it with the org's Stripe account credentials (`stripe_account_id`, `stripe_status: "active"`, `stripe_payments_enabled: true`, `stripe_connect_status: "active"`)
  - Include an `auto_connected_location_id` field in the response so the frontend can show feedback
  - If multiple unconnected locations exist, skip auto-connect (multi-LLC operator should choose manually)

### 2. Frontend: `src/hooks/useZuraPayConnect.ts`

Update `useVerifyZuraPayConnection` `onSuccess`:
- If `data.auto_connected_location_id` is present, show a toast like "Your location has been automatically connected to Zura Pay"
- Invalidate location queries to refresh the Fleet tab

### Technical Details

**Edge function addition** (after line 99 in verify function):
```typescript
if (newStatus === "active" && org.stripe_connect_status !== "active") {
  // Auto-connect single-location orgs
  const { data: unconnectedLocs } = await supabase
    .from("locations")
    .select("id")
    .eq("organization_id", organization_id)
    .is("stripe_account_id", null)
    .eq("is_active", true);

  if (unconnectedLocs?.length === 1) {
    await supabase.from("locations").update({
      stripe_account_id: org.stripe_connect_account_id,
      stripe_status: "active",
      stripe_payments_enabled: true,
      stripe_connect_status: "active",
    }).eq("id", unconnectedLocs[0].id);
  }
}
```

| File | Change |
|------|--------|
| `supabase/functions/verify-zura-pay-connection/index.ts` | Add auto-connect logic when status transitions to active |
| `src/hooks/useZuraPayConnect.ts` | Handle `auto_connected_location_id` in verify success callback |

