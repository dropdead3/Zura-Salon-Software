

# Add Zura Pay Payouts Dashboard

## Problem

Operators currently have no visibility into their Zura Pay payout activity within the platform. They must log into Phorest Pay (or the Stripe dashboard) to see balance, recent payouts, and payout timing. The screenshot shows the Phorest Pay payouts view with balance cards, next payout, and a recent payouts table — we will build a premium equivalent inside the existing Zura Pay configurator.

## Design

Inspired by the Phorest screenshot but elevated for Zura's design system:

**Summary Cards Row** (3 cards, consolidated from Phorest's 4):
- **Available Balance** — current available balance from Stripe, with "From recent sales" subtext
- **Previous Payout** — last payout amount + date
- **Next Payout** — estimated next payout amount + expected date (or "No payout scheduled")

All monetary values wrapped in `BlurredAmount` for privacy toggle support.

**Recent Payouts Table:**
- Columns: Total Payout, Status (badge), Date Sent, Date Expected
- Status badges: Paid (emerald), In Transit (amber), Pending (muted)
- Paginated or limited to last 25 payouts
- No CSV download initially (can add later)

## Changes

### 1. New Edge Function: `supabase/functions/zura-pay-payouts/index.ts`

Fetches from the org's connected Stripe account:
- `stripe.balance.retrieve()` on the connected account (using `stripeAccount` header)
- `stripe.payouts.list({ limit: 25 })` on the connected account
- Returns `{ balance, payouts }` as JSON

Auth: validates JWT + org membership. Uses org's `stripe_connect_account_id` from the `organizations` table.

### 2. New Hook: `src/hooks/useZuraPayPayouts.ts`

- `useZuraPayPayouts(orgId)` — calls the edge function, returns balance + payouts data
- Query key: `['zura-pay-payouts', orgId]`
- `staleTime: 60000` (1 minute)

### 3. New Component: `src/components/dashboard/settings/terminal/ZuraPayPayoutsTab.tsx`

- Summary cards row using design tokens
- Payouts table using `tokens.table.columnHeader`, status badges per `tokens.status`
- Empty state if no payouts yet
- Loading skeletons

### 4. Modified: `src/components/dashboard/settings/TerminalSettingsContent.tsx`

- Add "Payouts" tab trigger alongside Fleet, Hardware, Connectivity, Display
- Render `ZuraPayPayoutsTab` in a new `TabsContent`
- Only show the tab when connect status is `active`

## Technical Notes

- Edge function uses `stripe.balance.retrieve({}, { stripeAccount: connectAccountId })` for connected account context
- Payout amounts are in cents — divide by 100 for display
- No migration needed — reads from Stripe API only
- The Stripe test sandbox will return test payouts which is perfect for validation

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/zura-pay-payouts/index.ts` | New edge function — fetch balance + payouts from connected account |
| `src/hooks/useZuraPayPayouts.ts` | New hook — query wrapper |
| `src/components/dashboard/settings/terminal/ZuraPayPayoutsTab.tsx` | New component — summary cards + payouts table |
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | Add Payouts tab |

0 migrations, 1 new edge function, 0 new dependencies.

