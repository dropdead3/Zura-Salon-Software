

# Remaining Gaps and Bugs

The major issues from the previous plan have been fixed. Here are the remaining items:

## Bug: Webhook doesn't sync bank info for staff accounts

The `handleAccountUpdated` webhook handler (line 1031-1038) updates `stripe_status`, `charges_enabled`, `payouts_enabled`, and `details_submitted` for staff accounts — but does **not** fetch or update `bank_last4` and `bank_name`. The `verify_status` edge function action does this (lines 200-213), but the webhook path skips it. After onboarding, the staff member's bank details will show as blank until they manually click "Refresh."

**Fix**: In the webhook handler's staff account branch, retrieve the Stripe account's `external_accounts` and update `bank_last4`/`bank_name`.

## Bug: `onboarding=refresh` URL not handled

The edge function sets `refresh_url` to `?onboarding=refresh` (Stripe redirects here when the onboarding link expires or needs regeneration). `MyPay.tsx` only checks for `onboarding=complete` — the `refresh` case is silently ignored. The user lands on the page with a stale query param and no feedback.

**Fix**: In `MyPay.tsx`, detect `onboarding=refresh` and show a toast prompting the user to restart onboarding ("Your verification link expired. Please try connecting again."), then clear the param.

## Bug: Bulk direct deposit fires mutations in a loop without awaiting

In `TipDistributionManager.tsx` (lines 108-120), bulk direct deposit processes each payout by calling `payoutMutation.mutate()` in a `for` loop. This fires all requests simultaneously without `await`, and the `completed` counter uses closure state that may not increment correctly across async callbacks. If one fails, others still proceed — no rollback.

**Fix**: Use `Promise.allSettled` with `mutateAsync` instead. Report successes and failures separately. Clear selection only for successful items.

## Gap: Single confirm dialog uses `bulkMethod` instead of per-row method

The single-row "Confirm" button opens a dialog whose method is determined by `bulkMethod` (the bulk action selector). If the admin has the bulk selector set to "Direct Deposit" but clicks "Confirm" on a single row intending cash, it will attempt a direct deposit. The method should be selectable within the dialog, or default to the org's policy method.

**Fix**: Add a method selector inside the single-confirm dialog so the admin explicitly chooses the method per distribution.

## Gap: `APP_URL` env var may not be set

The `staff-payout-onboarding` function uses `Deno.env.get("APP_URL")` with a fallback to `https://getzura.com`. For multi-org deployments or white-label scenarios, the return URL will always point to `getzura.com` regardless of how the user accessed the app. This could break onboarding returns for custom domains.

**Fix**: Accept the current app origin from the request body or derive it from the `Origin`/`Referer` header (with allowlist validation).

## Minor: `useMyPendingTipTotal` query may return stale data

The pending tip total shown in `MyPayoutSetup` doesn't invalidate when tips are confirmed or paid. A stylist might see "$200 pending" after their tips have already been paid.

**Fix**: Ensure the query key for `my-pending-tip-total` is invalidated alongside `tip-distributions` in the payout mutation's `onSuccess`.

---

## Proposed Fix Plan

| # | File | Change |
|---|---|---|
| 1 | `supabase/functions/stripe-webhook/index.ts` | Fetch `external_accounts` and sync `bank_last4`/`bank_name` in staff account branch |
| 2 | `src/pages/dashboard/MyPay.tsx` | Handle `?onboarding=refresh` with user-facing toast and param cleanup |
| 3 | `src/components/dashboard/payments/TipDistributionManager.tsx` | Use `Promise.allSettled` + `mutateAsync` for bulk direct deposit; add per-row method selector in single confirm dialog |
| 4 | `supabase/functions/staff-payout-onboarding/index.ts` | Derive return URL from request origin with allowlist validation instead of static `APP_URL` |
| 5 | `src/hooks/useTipDistributions.ts` | Invalidate `my-pending-tip-total` in payout mutation `onSuccess` |

