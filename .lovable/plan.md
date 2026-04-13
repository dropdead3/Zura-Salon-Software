

# Gaps & Bugs: Staff Tip Payout Feature

## Critical Gaps

### 1. No feature gating — MyPayoutSetup and My Tips always render
`MyPayoutSetup` and `MyTipsHistory` render unconditionally on the "My Tips" tab. There is **no check** for whether the org admin has enabled tip distributions or selected `direct_deposit` as the default method. A stylist sees "Connect Bank Account" even if the org has tip distributions disabled or uses cash-only payouts.

**Fix**: Read the `tip_distribution_policy` setting. Hide the entire "My Tips" tab when `enabled === false`. Show `MyPayoutSetup` only when the policy's `default_method` is `direct_deposit` (or offer it as opt-in regardless, with contextual copy explaining the org supports direct deposit).

### 2. Onboarding opens in new tab — return URL broken
`handleConnect` calls `window.open(url, '_blank')`. The return URL from Stripe includes `?onboarding=complete`, but it returns to the **new tab**, not the original. The `useEffect` on the original tab never fires. The user lands on a fresh page load in the new tab with the query param, but if they navigate away before the effect runs, the status never refreshes.

**Fix**: Use `window.location.href` instead of `window.open` to keep the user in the same tab, or add the onboarding detection to `MyPayoutSetup` itself (not just the parent page).

### 3. No admin visibility into staff payout account statuses
Admins have no UI to see which stylists have connected bank accounts, who is verified, and who hasn't started. When confirming direct deposit distributions, they get a warning icon but no centralized view.

**Fix**: Add a "Staff Payout Accounts" section to Payment Ops or the Tip Distribution Manager showing each stylist's connection status, with the ability to nudge incomplete onboarding.

### 4. Onboarding return `useEffect` can double-fire
The effect depends on `searchParams` and `effectiveOrganization?.id` but mutates `searchParams` synchronously. React 18 strict mode or fast re-renders could trigger the mutation twice. The `refreshStatus.mutate` call doesn't guard against being already in-flight.

**Fix**: Add a `useRef` guard to ensure the effect runs exactly once.

### 5. Stylist doesn't know *why* they should connect
The `MyPayoutSetup` empty state says "Connect your bank account to receive daily tip payouts directly" but doesn't show how much they've earned in pending tips. There's no motivation — a stylist with $0 tips sees the same prompt as one with $200 pending.

**Fix**: Show pending tip total above the connect CTA: "You have $X in pending tips. Connect your bank to receive them via direct deposit."

## Moderate Issues

### 6. `MyPayoutSetup` uses `useColorBarOrgId` inconsistency
The settings component uses `useColorBarOrgId` but the payout setup uses `useOrganizationContext` directly. These should use the same org resolution path to avoid mismatches.

### 7. No loading/error state for onboarding link generation
If the edge function is slow or fails, the button shows a spinner but there's no timeout or error recovery UX beyond the toast. The user might click multiple times.

## Proposed Fix Plan

| # | File | Change |
|---|---|---|
| 1 | `src/pages/dashboard/MyPay.tsx` | Gate "My Tips" tab visibility on `tip_distribution_policy.enabled`; fix onboarding `useEffect` with ref guard |
| 2 | `src/components/dashboard/mypay/MyPayoutSetup.tsx` | Gate rendering on policy `default_method === 'direct_deposit'`; use `window.location.href` for onboarding; show pending tip total as motivation |
| 3 | `src/components/dashboard/mypay/MyTipsHistory.tsx` | No changes needed (gated by parent) |
| 4 | `src/components/dashboard/payments/TipDistributionManager.tsx` | Add a "Staff Accounts" summary showing connected vs unconnected stylists |
| 5 | `src/hooks/useStaffPayoutAccount.ts` | No changes needed |

