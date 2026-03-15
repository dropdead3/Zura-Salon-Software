

# Billing Alerts Banner System

## Overview

Add a client-side `BillingAlertsBanner` component at the top of the Account & Billing page that computes alert conditions from already-fetched data (trial status, payment method expiry, failed invoices) and renders amber/red banners with one-click resolution CTAs. No new edge functions or database tables needed — all data is already available from `useTrialStatus`, `useOrgPaymentInfo`, and `useOrganizationBilling`.

## Alert Conditions

| Alert | Source | Threshold | Severity | CTA |
|-------|--------|-----------|----------|-----|
| Trial ending | `useTrialStatus` | ≤7 days remaining | amber (≤7d), red (≤2d) | "Choose a Plan" → scroll to PlanComparisonCard |
| Card expiring | `useOrgPaymentInfo` → `payment_method.exp_month/year` | Within 60 days | amber | "Update Card" → opens Stripe billing portal |
| Card expired | Same | Past expiry | red | "Update Card" → opens Stripe billing portal |
| Failed payment | `useOrgPaymentInfo` → `invoices` with `status === 'open'` or latest invoice failed | Any unpaid | red | "Retry Payment" → opens Stripe billing portal |
| No payment method | `useOrgPaymentInfo` → `payment_method === null` (only when on a paid plan) | Always | amber | "Add Payment Method" → opens Stripe billing portal |

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/dashboard/settings/BillingAlertsBanner.tsx` | New — renders stacked alert banners |
| `src/hooks/useBillingAlerts.ts` | New — computes alert array from existing hooks |
| `src/components/dashboard/settings/AccountBillingContent.tsx` | Modify — add `<BillingAlertsBanner />` above the grid |

## Component Design

`useBillingAlerts` hook returns an array of `{ id, severity, title, description, ctaLabel, ctaAction }` objects computed from the three existing data sources. No new API calls.

`BillingAlertsBanner` renders each alert as an amber or red banner with an `AlertTriangle` icon, message text, and a `Button` CTA on the right. Banners stack vertically. Uses existing design tokens and the `useOpenBillingPortal` mutation for portal CTAs. Trial alert scrolls to the plan comparison section via `document.getElementById`.

## Technical Notes

- Pure client-side computation — no new edge functions, no new database tables
- Reuses `useTrialStatus`, `useOrgPaymentInfo`, `useOpenBillingPortal`, and `useOrganizationBilling` already imported on this page
- Card expiry check reuses the same `getExpiryStatus` logic already in `PaymentMethodCard.tsx` (will extract to shared util or inline in hook)
- Alerts auto-refresh with the same cadence as the underlying queries (5-minute stale time for payment info, real-time for trial)

