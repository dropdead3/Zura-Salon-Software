

# Add Billing & Payment Explainers

## Problem
Users see the Account & Billing page and reasonably wonder whether each location gets billed separately — especially multi-LLC operators. There's no contextual guidance distinguishing the platform subscription (org-level, single invoice) from Zura Pay (location-level payouts via Stripe Connect).

## Changes

### 1. Update `account-management` explainer in the registry
Replace the current generic description with one that clarifies:
- Billing is at the organization level — one subscription, one invoice
- Costs are itemized per location ($200/loc/mo for Growth+) so your accountant can allocate to each LLC
- This is separate from Zura Pay, which handles customer payment processing and payouts per-location

### 2. Add `PageExplainer` to `AccountBillingContent.tsx`
Insert `<PageExplainer pageId="account-management" />` at the top of the billing content (after the access/alert banners, before the card grid).

### 3. Add a Zura Pay explainer entry
Add a `zura-pay-config` entry to the registry explaining:
- Zura Pay handles customer-facing payment processing (terminals, card-on-file, deposits)
- Each location can have its own Stripe Connect account for separate LLC banking and payouts
- This is independent of the platform subscription on the Account & Billing page

### 4. Add `PageExplainer` to `TerminalSettingsContent.tsx`
Insert `<PageExplainer pageId="zura-pay-config" />` at the top of the Zura Pay configurator.

### 5. Add a `business-identity` explainer entry
Update or add an entry explaining:
- Org-level EIN and Legal Name are defaults for all locations
- Individual locations can override these in Location Settings for multi-LLC setups
- Stripe Connect collects its own legal/banking data separately during onboarding

### Files

| File | Change |
|------|--------|
| `src/config/pageExplainers.ts` | Update `account-management` description; add `zura-pay-config` and `business-identity` entries |
| `src/components/dashboard/settings/AccountBillingContent.tsx` | Add `<PageExplainer pageId="account-management" />` |
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | Add `<PageExplainer pageId="zura-pay-config" />` |
| Business Identity settings component | Add `<PageExplainer pageId="business-identity" />` (will locate exact file during implementation) |

