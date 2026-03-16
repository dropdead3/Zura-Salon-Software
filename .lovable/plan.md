

# Remove Trial Functionality from Backroom

You're right — trials don't make sense for Backroom given the configuration complexity, team training requirements, and hardware costs. Trial references are scattered across several layers. Here's the cleanup plan:

## Scope of Changes

### 1. Backroom Entitlements Tab (Platform Admin UI)
**`src/components/platform/backroom/BackroomEntitlementsTab.tsx`**
- Remove the "Trial End" column from the location table header
- Remove the "Start Trial" button and its associated logic (the `supabase` upsert that sets `status: 'trial'` and `trial_end_date`)
- Remove trial end date display cell (the countdown logic)
- Remove `'trial'` from status checks — locations are either `active` or `inactive`, not `trial`
- Remove `trial` from the status badge map

### 2. Backroom Analytics Tab
**`src/components/platform/backroom/BackroomAnalyticsTab.tsx`**
- Remove the `${metrics.totalTrialOrgs} in trial` subtitle from the KPI card

### 3. Backroom Billing Tab
**`src/components/platform/backroom/BackroomBillingTab.tsx`**
- Remove `trialing` status badge entry
- Remove `earliestTrialEnd` check from the attention-needed filter

### 4. Backroom Subscription Page (Org Admin)
**`src/pages/dashboard/admin/BackroomSubscription.tsx`**
- Remove trial banner, trial badge, trial status display, and all `isTrialing`/`trialEnd`/`trialDaysLeft` logic

### 5. Location Entitlements Hook
**`src/hooks/backroom/useBackroomLocationEntitlements.ts`**
- Remove `trial_end_date` from the interface (keep in DB schema — no migration needed, just stop using it)

### Not Touching (Out of Scope)
- `useTrialStatus.ts`, `TrialCountdownBanner.tsx`, `useBillingAlerts.ts`, `BillingOverviewCard.tsx` — these handle **organization-level subscription trials** (Stripe-based), which are a separate concept from Backroom-specific trials. If you want those removed too, that's a separate effort.
- Database columns (`trial_end_date` in `backroom_location_entitlements`) — harmless nullable columns, no migration needed.

