

# Build Analysis: Gaps, Bugs & Enhancements

## Bugs / Critical Gaps

### 1. Webhook handler missing `account.updated` for staff accounts
The plan called for handling `account.updated` in `stripe-webhook/index.ts` to sync staff payout account verification status. **This was never implemented.** The webhook has zero references to `staff_payout_accounts`. This means after a staff member completes Stripe onboarding, their status will remain "pending" in the database until they manually click "Refresh" — a poor experience and a reliability gap.

### 2. `staff-payout-onboarding` RLS conflict on `create_account`
The edge function uses a **service-role client** to upsert into `staff_payout_accounts`, but the RLS INSERT policy only allows **org admins**. When a regular staff member triggers onboarding, the service-role client bypasses RLS — this works, but if any future code path uses the anon/user client to insert, it will silently fail. The migration should also have a policy allowing staff to insert their own row (`auth.uid() = user_id`), or the architecture should be explicitly documented as service-role-only writes.

### 3. `generate-tip-distributions` CORS headers incomplete
Line 6 of `generate-tip-distributions/index.ts` has a minimal CORS header set missing the modern Supabase client headers (`x-supabase-client-platform`, etc.). The other two edge functions include them. This could cause CORS failures on newer SDK versions.

### 4. `generate-tip-distributions` overwrites confirmed distributions
When re-generating for a date, the edge function updates `total_tips`, `cash_tips`, `card_tips` on existing rows regardless of status. If a manager has already **confirmed** a distribution, re-generating will silently overwrite the amounts without resetting the confirmation. This should skip rows with `status != 'pending'`.

### 5. `TipDistributionManager` — direct deposit confirms without invoking payout
Selecting "Direct Deposit" as the method and clicking "Confirm" just updates the `status` to `confirmed` with `method = 'direct_deposit'` via a regular DB update. It does **not** invoke `process-tip-payout`. The edge function exists but is never called from the UI. Direct deposit confirmations should trigger the payout edge function.

### 6. Bulk confirm with direct deposit has no account validation
Bulk confirming with method `direct_deposit` does not check whether each stylist has a verified payout account. Could confirm distributions that can never actually be paid.

## Moderate Issues

### 7. `MyTipsHistory` date range is fixed to current month
The `dateFrom` and `dateTo` states are initialized once and never updated (no date picker). Staff can only ever see the current calendar month's tips. A period selector or "Previous Period" navigation is needed.

### 8. `TipDistributionPolicySettings` missing `direct_deposit` as default method
The policy settings dropdown offers Cash, Manual Transfer, and Payroll — but not Direct Deposit, even though it's an option in the distribution manager.

### 9. No `onboarding=complete` return URL handling
`staff-payout-onboarding` sets return URL to `?onboarding=complete`, but `MyPay.tsx` doesn't check query params. After completing Stripe onboarding, the page just loads normally without auto-refreshing the account status.

### 10. `process-tip-payout` Stripe transfer architecture concern
The function creates a transfer with `stripeAccount: org.stripe_connect_account_id`, meaning it transfers funds **from the org's Connected Account balance**. This is correct for a platform model, but requires the org's Connected Account to have sufficient balance from collected card tips. There's no balance check before attempting the transfer — Stripe will return an error, but the user gets a generic failure message.

## Enhancements

### 11. Add Stripe balance pre-check before direct deposit payout
Before creating a Stripe Transfer, retrieve the org's Connected Account balance and compare against the payout amount. Surface a clear "Insufficient balance" message rather than a generic Stripe error.

### 12. Add `direct_deposit` method to `TipDistributionPolicySettings`
Include it as an option in the default method selector so orgs preferring direct deposit don't have to change it every time.

### 13. Add onboarding return handler in `MyPay`
Detect `?onboarding=complete` query param, auto-trigger `refreshStatus`, and show a success toast.

### 14. Add date range picker to `MyTipsHistory`
Allow staff to navigate between months or custom date ranges.

### 15. Wire `process-tip-payout` to the UI
When confirming (single or bulk) with method `direct_deposit`, invoke the edge function instead of doing a plain DB update.

---

## Proposed Fix Plan

| # | File | Change |
|---|---|---|
| 1 | `supabase/functions/stripe-webhook/index.ts` | Add `account.updated` handler that syncs `staff_payout_accounts` |
| 2 | `supabase/functions/generate-tip-distributions/index.ts` | Fix CORS headers; skip updating confirmed/paid rows |
| 3 | `src/components/dashboard/payments/TipDistributionManager.tsx` | Wire direct deposit confirms to `process-tip-payout` edge function; add payout account validation |
| 4 | `src/hooks/useTipDistributions.ts` | Add `useProcessTipPayout` mutation hook |
| 5 | `src/components/dashboard/mypay/MyTipsHistory.tsx` | Add month navigation |
| 6 | `src/components/dashboard/settings/TipDistributionPolicySettings.tsx` | Add `direct_deposit` to method options |
| 7 | `src/pages/dashboard/MyPay.tsx` | Handle `?onboarding=complete` return URL with auto-refresh |

