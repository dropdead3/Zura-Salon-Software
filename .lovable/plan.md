

# Fix Build Error + Staff Tip Bank Account Connection

## Part 1: Fix Build Error (TS2589)

The `useOrganizationIntegrations.ts` error is caused by the Supabase client inferring deeply nested types from the relation query (`phorest_staff_mapping` joined through `locations`). The new `tip_distributions` table addition likely pushed the type complexity over TypeScript's recursion limit.

**Fix**: Cast the query result or split the relation query into two separate queries to avoid deep type inference.

| File | Change |
|---|---|
| `src/hooks/useOrganizationIntegrations.ts` | Add explicit type cast to the Phorest query result to break the deep type chain |

## Part 2: Staff Bank Account Connection for Tip Payouts

### Considerations

Before building, here's what matters:

1. **Stripe Connect Express vs Custom** — Each stylist needs their own Stripe Connected Account to receive transfers. Express is simplest (Stripe-hosted onboarding).
2. **KYC/Identity Verification** — Stripe handles this during onboarding, but staff must provide SSN, DOB, address. This is a regulatory requirement.
3. **Tax Implications** — Tips paid via bank transfer may require 1099 reporting. Organizations should be aware.
4. **Security** — Bank details are never stored in our database. Stripe holds everything. We only store the Stripe account ID and verification status.
5. **Payout Timing** — Stripe transfers take 1-2 business days. "Daily" means initiated daily, arrives next business day.
6. **Minimum Payout** — Consider a minimum threshold (e.g., $1) to avoid micro-transfers.
7. **Org Authorization** — The org's Connected Account must have sufficient balance to fund transfers. Tips collected via card go through the org's Stripe account first.

### Architecture

```text
Staff clicks "Connect Bank" in My Pay
        │
        ▼
Edge function creates Stripe Express Account for staff
        │
        ▼
Staff completes Stripe-hosted onboarding (KYC, bank info)
        │
        ▼
Webhook confirms account verified → update staff_payout_accounts
        │
        ▼
When tip distribution is confirmed with method='direct_deposit':
  Edge function creates Stripe Transfer from org's Connected Account
  to staff's Connected Account
```

### Implementation

#### 1. Migration: `staff_payout_accounts` table

New table storing the link between staff and their Stripe accounts:
- `id`, `organization_id`, `user_id` (unique per org)
- `stripe_account_id` — the staff member's Express account ID
- `stripe_status` — `pending` | `active` | `restricted` | `disabled`
- `charges_enabled`, `payouts_enabled`, `details_submitted` — booleans from Stripe
- `bank_last4`, `bank_name` — masked display info (no sensitive data)
- `created_at`, `updated_at`
- RLS: staff can read their own row; admins can read all in org

#### 2. Edge Function: `staff-payout-onboarding`

Actions:
- `create_account` — Creates a Stripe Express Connected Account for the staff member, returns an onboarding link
- `create_login_link` — Generates a Stripe Express dashboard login link for the staff member
- `verify_status` — Checks current verification state and syncs to DB

This uses the org's platform account as the "platform" in Stripe's Connect hierarchy (org → staff).

#### 3. Edge Function: `process-tip-payout`

When a manager confirms a tip distribution with method `direct_deposit`:
- Looks up the staff member's `staff_payout_accounts.stripe_account_id`
- Creates a Stripe Transfer from the org's Connected Account balance to the staff's account
- Updates `tip_distributions.status` to `paid` and records `paid_at`

#### 4. UI: Bank Account Setup in My Pay

New component `MyPayoutSetup.tsx` in the My Pay page:
- Shows current bank connection status
- "Connect Bank Account" button → triggers onboarding link
- Once connected: shows bank name + last4, verification status
- "Manage Account" link → Stripe Express dashboard

#### 5. UI: Direct Deposit option in Tip Distribution Manager

Add `direct_deposit` as a method option in the manager's method selector. When confirming with this method:
- Validate the stylist has a verified payout account
- Show warning if account not yet verified
- On confirm, invoke `process-tip-payout` edge function

#### 6. Webhook Handler Update

Add handling for `account.updated` events scoped to staff accounts:
- Sync `charges_enabled`, `payouts_enabled`, `details_submitted` to `staff_payout_accounts`
- Update status based on Stripe account state

### Files

| File | Action |
|---|---|
| `src/hooks/useOrganizationIntegrations.ts` | Fix TS2589 build error |
| Migration | Create `staff_payout_accounts` table with RLS |
| `supabase/functions/staff-payout-onboarding/index.ts` | **New** — account creation + onboarding links |
| `supabase/functions/process-tip-payout/index.ts` | **New** — Stripe Transfer execution |
| `src/hooks/useStaffPayoutAccount.ts` | **New** — query/mutation hooks for payout accounts |
| `src/components/dashboard/mypay/MyPayoutSetup.tsx` | **New** — bank connection UI for staff |
| `src/pages/dashboard/MyPay.tsx` | Add payout setup section |
| `src/components/dashboard/payments/TipDistributionManager.tsx` | Add `direct_deposit` method + payout trigger |
| `supabase/functions/stripe-webhook/index.ts` | Handle `account.updated` for staff accounts |

