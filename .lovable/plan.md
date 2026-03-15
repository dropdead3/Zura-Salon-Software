

# Account Management Settings Configurator

## Context

The current `/dashboard/admin/settings` page is a card-grid of configuration categories (business, email, users, etc.). There is no org-facing billing/subscription management — that currently only exists in the **platform admin** panel (`BillingConfigurationPanel`). Organization owners need a self-service view to see their plan, costs, and manage payment.

## What to Build

A new **"Account & Billing"** settings category card that opens a dedicated configurator with the following sections:

### 1. Subscription Overview Card
- Current plan name, tier, and billing cycle (monthly/annual)
- Next billing date and amount
- Contract start/end dates
- Trial status with days remaining (reuse `useTrialStatus`)
- Plan upgrade/downgrade CTA

### 2. Cost Breakdown Card
- Base plan cost
- Per-location fees (with location count)
- Backroom subscription costs (per-location entitlements from `backroom_location_entitlements`)
- Scale license fees
- Add-on totals
- **Monthly total** with cycle discount display

### 3. Plan Comparison & Upgrade
- Reuse the existing `PlanSelector` component (adapted for dashboard theme instead of platform dark theme)
- Show current plan highlighted, with upgrade path
- Trigger Stripe checkout for plan changes

### 4. Payment Method Management
- Display current payment method on file (last 4 digits, expiry)
- "Update Payment Method" button → opens Stripe Customer Portal session
- Payment method status indicator (valid/expiring soon/expired)

### 5. Billing History
- List of past invoices with date, amount, status (paid/pending/failed)
- Download invoice PDF links (via Stripe)
- Reuse pattern from `BillingHistoryCard` adapted for org-facing view

### 6. Backroom Add-Ons Summary
- Per-location Backroom tier and cost
- Scale license count and cost
- Total Backroom monthly spend
- Link to Backroom Settings for management

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/dashboard/settings/AccountBillingContent.tsx` | New — main content component with all sections |
| `src/components/dashboard/settings/BillingOverviewCard.tsx` | New — subscription status + cost breakdown |
| `src/components/dashboard/settings/PaymentMethodCard.tsx` | New — payment method display + update via Stripe portal |
| `src/components/dashboard/settings/OrgBillingHistoryCard.tsx` | New — invoice history list |
| `src/components/dashboard/settings/PlanComparisonCard.tsx` | New — plan selector adapted for dashboard theme |
| `src/components/dashboard/settings/BackroomCostSummaryCard.tsx` | New — Backroom entitlement costs rollup |
| `src/hooks/useOrgPaymentMethod.ts` | New — hook to fetch payment method from Stripe via edge function |
| `src/hooks/useOrgInvoiceHistory.ts` | New — hook to fetch invoice list from Stripe via edge function |
| `supabase/functions/org-billing-portal/index.ts` | New — edge function to create Stripe Customer Portal session |
| `supabase/functions/org-payment-info/index.ts` | New — edge function to fetch payment method + invoice history from Stripe |
| `src/pages/dashboard/admin/Settings.tsx` | Modify — add `account-billing` to `SettingsCategory` type and card grid |
| `src/hooks/useSettingsLayout.ts` | Modify — add `account-billing` to `SECTION_GROUPS` |

## Technical Notes

- **Stripe integration**: Payment method and invoice data require edge functions since Stripe secret key is server-side only. The `org-billing-portal` function creates a Stripe Customer Portal session (same pattern as the existing `customer-portal` edge function pattern). The `org-payment-info` function fetches the customer's default payment method and recent invoices.
- **Authorization**: Edge functions validate that the requesting user is an org admin (`is_org_admin`) before returning billing data.
- **Theme**: All new components use the dashboard theme system (`useDashboardTheme`, standard `Card`/`Button` components) — not the platform `PlatformCard` variants.
- **Existing hooks**: Reuse `useOrganizationBilling`, `useSubscriptionPlans`, `useBillingCalculations`, `useTrialStatus`, and `useBackroomLocationEntitlements` for all data that's already in the database.
- **Stripe connector**: The project already has Stripe connected. The edge functions use `STRIPE_SECRET_KEY` from environment.

