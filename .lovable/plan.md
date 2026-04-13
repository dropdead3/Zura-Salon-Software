

# Move POS Operations into the Operations Hub

## Principle

Settings = **configuration** (connect Zura Pay, register readers, order hardware, display settings).
Operations Hub = **daily operational functions** (till reconciliation, end-of-day close, refund queue, deposit holds).

The current state mixes these concerns. Till reconciliation is embedded inline in the Transactions tab of the Appointments Hub. Refund processing is scattered. There is no dedicated "end of day" workflow. This plan separates configuration from operations cleanly.

## What Moves

| Feature | Current Location | New Location |
|---------|-----------------|--------------|
| Till Reconciliation | Inline in `TillBalanceSummary` (Transactions tab) | New "Payment Operations" page in Operations Hub |
| Refund Queue | Only accessible per-transaction | Surfaced as a card in Operations Hub → links to dedicated refund management |
| Deposit Holds | No UI — hooks exist but no visibility | Card in Operations Hub showing active holds with capture/release actions |

## What Stays in Settings

- Zura Pay Connect onboarding (Stripe Express account setup)
- Fleet management (terminal locations, reader registration)
- Hardware ordering (S710 purchases)
- S710 display simulator
- Location-level payment enablement

## Changes

### 1. New page: Payment Operations (`/dashboard/admin/payment-ops`)

A dedicated page accessible from the Operations Hub with three sections:

- **Till Reconciliation**: Date picker, reconcile button, Stripe vs. local comparison, discrepancy details. Extracted from `TillBalanceSummary` into its own full-page component with richer detail (expandable discrepancy rows, resolution actions).
- **Active Deposit Holds**: Table of appointments with `deposit_status = 'held'`, showing client name, amount, appointment date, and capture/release buttons. Uses existing `useTerminalDeposit` hook.
- **Pending Refunds**: Table of `refund_records` with status `pending`, showing source transaction, amount, type, and a "Process" action that triggers the `process-stripe-refund` edge function.

### 2. Operations Hub card

Add a new section **"Financial Operations"** to `TeamHub.tsx` (between "Daily Operations" and "Scheduling & Time Off") with:

- **Payment Operations** card → links to `/dashboard/admin/payment-ops`
- Icon: `Banknote` or `CreditCard`
- Description: "Till reconciliation, deposit holds, and refund processing"
- Stat badge: count of pending refunds + active holds (optional, fetched via lightweight query)

### 3. Simplify TillBalanceSummary

The inline `TillBalanceSummary` in the Transactions tab keeps its role as a **summary bar** (cash/card/tips totals) but the "Reconcile" button changes behavior:

- Instead of running reconciliation inline, it navigates to `/dashboard/admin/payment-ops` with the selected date as a query param
- The detailed reconciliation results, discrepancy drilldown, and Stripe verification move to the dedicated page

### 4. Route and nav wiring

- Add route in `App.tsx`: `/dashboard/admin/payment-ops` → lazy-loaded `PaymentOps` page
- Add card in `TeamHub.tsx` under new "Financial Operations" section
- Add `Banknote` to the icon map in TeamHub
- `TillBalanceSummary` reconcile button becomes a navigation link

### 5. Sidebar sub-link

Per the Operations Hub architecture, if a user favorites "Payment Operations," it appears as an indented sub-link under Operations Hub in the sidebar.

---

## Files

| File | Action |
|------|--------|
| `src/pages/dashboard/admin/PaymentOps.tsx` | **New** — Full payment operations page with till reconciliation, deposit holds, and refund queue |
| `src/pages/dashboard/admin/TeamHub.tsx` | **Modify** — Add "Financial Operations" section with Payment Operations card |
| `src/components/dashboard/transactions/TillBalanceSummary.tsx` | **Modify** — Replace inline reconciliation with navigation link to payment-ops page |
| `App.tsx` | **Modify** — Add route for `/dashboard/admin/payment-ops` |

0 migrations, 0 new edge functions, 0 new dependencies.

