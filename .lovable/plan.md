

# Daily Tip Distribution System

## What This Builds

A "Tip Distribution" workflow that calculates each stylist's earned tips daily, presents them to a manager for review/confirmation, and records the payout for compliance tracking. This mirrors the Phorest model without requiring individual stylist bank account onboarding.

## Architecture

```text
Completed Appointments (tip_amount)
        │
        ▼
  Aggregation Query (per stylist, per day)
        │
        ▼
  Tip Distribution Screen (manager reviews)
        │
        ▼
  Confirm & Record (tip_distributions table)
        │
        ▼
  Payroll Reporting (feeds into payroll runs)
```

## Implementation

### 1. Database: `tip_distributions` table

New table tracking individual tip payouts:
- `id`, `organization_id`, `location_id`, `stylist_user_id`
- `distribution_date` (the business day)
- `total_tips` (calculated sum), `cash_tips`, `card_tips`
- `method`: `cash` | `manual_transfer` | `payroll`
- `status`: `pending` | `confirmed` | `paid`
- `confirmed_by` (manager user_id), `confirmed_at`
- `notes`
- RLS: org-scoped via `is_org_member` for read, `is_org_admin` for write
- Stylists can view their own distributions

### 2. Org Setting: `tip_distribution_policy`

Stored in `backroom_settings` with key `tip_distribution_policy`:
```json
{
  "enabled": true,
  "frequency": "daily",
  "default_method": "cash",
  "require_manager_confirmation": true,
  "auto_generate_time": "18:00"
}
```

### 3. Edge Function: `generate-tip-distributions`

Aggregates tips from completed appointments for a given date + location:
- Groups by `stylist_user_id` (from appointment assignments)
- Separates cash vs card tips (based on payment method on the transaction)
- Inserts `pending` rows into `tip_distributions`
- Can be triggered manually or via scheduled cron

### 4. UI: Tip Distribution Manager

New page or tab in Payment Operations (`/dashboard/admin/payment-ops`):
- **Daily view**: Date picker showing each stylist's tip total for the day
- **Status badges**: Pending → Confirmed → Paid
- **Bulk confirm**: Manager selects all and confirms distribution
- **Per-stylist detail**: Expandable row showing individual appointment tips
- **Method selector**: Cash / Manual Transfer / Include in Payroll

### 5. Stylist View: "My Tips"

In the stylist's "My Pay" section:
- Daily tip history with status (pending/confirmed/paid)
- Running total for current pay period
- Matches what appears on their payroll stub

### 6. Settings UI: Tip Distribution Policy

New card in Terminal Settings or Payroll Settings:
- Enable/disable daily tip distributions
- Default payout method
- Require manager confirmation toggle

## Files

| File | Action |
|---|---|
| Migration | Create `tip_distributions` table with RLS |
| `supabase/functions/generate-tip-distributions/index.ts` | **New** — aggregation + insert logic |
| `src/hooks/useTipDistributions.ts` | **New** — query/mutation hooks |
| `src/components/dashboard/payments/TipDistributionManager.tsx` | **New** — manager review UI |
| `src/components/dashboard/settings/TipDistributionPolicySettings.tsx` | **New** — org policy toggle |
| Payment Ops page or Payroll Hub | Add Tip Distribution section/tab |
| My Pay section | Add tip history for individual stylists |

## What This Does NOT Do (Yet)

- **No automatic money movement** — no Stripe transfers to individual stylists
- **No individual stylist bank onboarding** — that's Phase 2 if orgs want automated transfers
- **No Gusto API integration for tips** — tips are recorded for payroll reporting, but not auto-pushed to Gusto (future enhancement)

These can be layered on once the tracking foundation is solid.

