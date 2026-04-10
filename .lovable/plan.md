

# Full Sales Page — Phorest-Parity, Zura-Quality Build

## Current State

The existing Transactions page (`src/pages/dashboard/Transactions.tsx`) is a flat item-level list with basic filters (date preset, location, type, client search), summary KPI cards, a refund dialog, credits dialog, and a gift card tab. It queries `phorest_transaction_items` row-by-row — meaning a single checkout with 3 services shows as 3 separate rows with no grouping.

**What exists:**
- Item-level table with sort, type badges, promotion badges, refund status
- Refund dialog (3 methods: original payment, salon credit, gift card)
- Issue Credits dialog, Gift Card manager tab
- `refund_records` table with full audit trail
- `v_all_transaction_items` view (unified source across Phorest + retail)

**What's missing (Phorest parity):**
- Transaction-level grouping (one row per checkout, expandable to see items)
- Transaction Detail drawer (itemized breakdown, payment method subtotals, tip, tax, client info)
- Payment Method column and filter
- Staff column (performing stylist)
- Void Sale functionality
- Receipt actions (email/print)
- Edit Sale capability
- Till Balance / Petty Cash / Till Floats tabs
- Daily date navigation (prev/next day)

## Architecture

### Data Strategy

Transactions are currently stored as individual line items in `phorest_transaction_items`. For the grouped view, we aggregate client-side by `transaction_id`. No new tables needed for the core page — only a new `voided_transactions` table for void tracking.

**New table: `voided_transactions`**
- `id` (uuid, PK)
- `organization_id` (uuid, FK → organizations, RLS)
- `transaction_id` (text, the Phorest transaction_id)
- `void_reason` (text)
- `voided_by` (uuid, FK → auth.users)
- `voided_at` (timestamptz, default now())
- RLS: org-member read, org-admin write

### Page Restructure

Replace the flat item list with a **grouped transaction table**. Each row = one checkout (transaction_id), showing date, client, stylist, payment method, item count, total, status. Clicking a row opens the **Transaction Detail Sheet** (right-side drawer).

```text
┌─────────────────────────────────────────────────────────┐
│ SALES                                           [Actions]│
│ Page Explainer                                           │
├──────────────────────────────────────────────────────────┤
│ [Till Transactions] [Petty Cash] [Gift Cards]            │
├──────────────────────────────────────────────────────────┤
│ ◀ Apr 9, 2026 ▶   [Location ▾] [Payment ▾] [Search]    │
├──────────────────────────────────────────────────────────┤
│ KPIs: Total Revenue │ Transactions │ Avg Ticket │ Tips  │
├──────────────────────────────────────────────────────────┤
│ Date    Client    Stylist   Items  Payment  Total  Status│
│ 2:30pm  Jane D.   Maria     3     Card     $285   Paid  │
│ 1:15pm  Walk-in   Alex      1     Cash     $85    Paid  │
│ ...                                                      │
├──────────────────────────────────────────────────────────┤
│ Till Balance: $2,340   │ Cash: $420  Card: $1,920       │
└─────────────────────────────────────────────────────────┘
```

## Detailed Changes

### 1. New Hook: `useGroupedTransactions.ts`

Queries `phorest_transaction_items` grouped by `transaction_id`. Returns:
```ts
interface GroupedTransaction {
  transactionId: string;
  transactionDate: string;
  clientName: string | null;
  phorestClientId: string | null;
  stylistName: string | null;
  paymentMethod: string | null;
  locationId: string | null;
  branchName: string | null;
  items: TransactionLineItem[];
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  discountAmount: number;
  totalAmount: number;  // subtotal + tax
  refundStatus: string | null;
  isVoided: boolean;
}
```

Fetches all items for the date/location/payment filters, then groups client-side by `transaction_id`. Cross-references `refund_records` and `voided_transactions` for status enrichment.

### 2. New Component: `TransactionDetailSheet.tsx`

A right-side Sheet (not dialog) using `tokens.drawer.*` aesthetic. Opens when a transaction row is clicked.

**Sections:**
- **Header**: Client name (or "Walk-in"), date/time, transaction ID (truncated with copy), location badge
- **Items breakdown**: Table of line items — service/product icon, name, qty, unit price, discount, line total. Promo badges where applicable.
- **Payment summary**: Subtotal, discount, tax, tip (each on a row), grand total. Payment method badge (Card/Cash/Split with breakdown for multi-method like "Credit;Cash").
- **Actions footer**: Primary actions as pill buttons:
  - "Refund" → opens existing RefundDialog
  - "Void" → opens VoidConfirmDialog (new)
  - "Receipt" → dropdown with "Email Receipt" / "Print Receipt"
  - All monetary values wrapped in `BlurredAmount`

### 3. New Component: `VoidConfirmDialog.tsx`

AlertDialog confirmation with reason input. Creates a `voided_transactions` record. Uses `DRILLDOWN_DIALOG_CONTENT_CLASS` + `DRILLDOWN_OVERLAY_CLASS`. Requires org-admin permission.

### 4. Refactored `TransactionList.tsx` → `GroupedTransactionTable.tsx`

Replaces the old item-level table. Each row shows one transaction (grouped). Columns:
- Time (formatted from transaction_date)
- Client (name or "Walk-in")
- Stylist
- Items (count badge, e.g., "3 items")
- Payment (Card/Cash badge with icon)
- Total (BlurredAmount)
- Status (Paid/Refunded/Voided badge)
- Actions (kebab menu: View Details, Refund, Void, Receipt)

Click anywhere on row → opens TransactionDetailSheet.

### 5. Updated Page: `Transactions.tsx` → Renamed to "Sales"

**Tabs**: Till Transactions (default), Petty Cash, Gift Cards
- Rename page title from "Transactions" to "Sales"
- Add daily date navigation (◀ date ▶) replacing the preset dropdown for Till Transactions tab
- Add Payment Method filter dropdown (All, Card, Cash, Split)
- Add Staff filter if staff data is available
- Update KPI cards: Total Revenue, Transaction Count, Average Ticket, Total Tips
- Add Till Balance summary bar at bottom showing cash/card/total breakdown
- Petty Cash tab: placeholder with empty state (Phase 2 — no existing data model)

### 6. Receipt Functionality

**Email Receipt**: New edge function `send-receipt-email` that composes a formatted receipt from transaction data and sends via Lovable email infrastructure. Takes `transaction_id`, looks up items, formats HTML receipt, sends to client email (resolved from `phorest_clients`).

**Print Receipt**: Client-side — opens a print-optimized window with receipt HTML. No backend needed. Uses `window.print()` with a styled receipt template.

### 7. Database Migration

```sql
-- Voided transactions tracking
CREATE TABLE public.voided_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  transaction_id text NOT NULL,
  void_reason text,
  voided_by uuid NOT NULL REFERENCES auth.users(id),
  voided_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, transaction_id)
);

ALTER TABLE public.voided_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view voided transactions"
  ON public.voided_transactions FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can void transactions"
  ON public.voided_transactions FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
```

## Files

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useGroupedTransactions.ts` | Create | Grouped transaction query + void/refund status enrichment |
| `src/hooks/useVoidTransaction.ts` | Create | Mutation hook for voiding transactions |
| `src/components/dashboard/transactions/GroupedTransactionTable.tsx` | Create | Transaction-level table with row click → detail sheet |
| `src/components/dashboard/transactions/TransactionDetailSheet.tsx` | Create | Right-side Sheet with full transaction breakdown + actions |
| `src/components/dashboard/transactions/VoidConfirmDialog.tsx` | Create | Void confirmation AlertDialog with reason input |
| `src/components/dashboard/transactions/ReceiptPrintView.tsx` | Create | Print-optimized receipt component |
| `src/components/dashboard/transactions/TillBalanceSummary.tsx` | Create | Bottom bar showing cash/card/total breakdown |
| `src/components/dashboard/transactions/PaymentMethodBadge.tsx` | Create | Reusable badge for Card/Cash/Split display |
| `src/pages/dashboard/Transactions.tsx` | Rewrite | Full page restructure with grouped view, new filters, daily nav |
| `src/config/pageExplainers.ts` | Update | Update explainer for "sales" page ID |
| Migration | Create | `voided_transactions` table with RLS |

## Design Compliance

- All typography via `tokens.*` — no font-bold, no uppercase on table headers
- Sheet uses `tokens.drawer.*` (glass bento: bg-card/80, backdrop-blur-xl)
- Drill-down dialog uses `DRILLDOWN_DIALOG_CONTENT_CLASS`
- All monetary values wrapped in `BlurredAmount`
- Currency via `useFormatCurrency`
- KPI cards use `tokens.kpi.*`
- Empty states use `tokens.empty.*`
- Buttons use `tokens.button.*` sizing
- Table headers use `tokens.table.columnHeader` (Title Case, Aeonik Pro)
- PageExplainer included
- Tabs default to first tab ("till-transactions")

## Out of Scope (Phase 2)

- Edit Sale (requires POS write-back — architectural decision needed)
- Petty Cash CRUD (no data model exists yet — tab renders as placeholder)
- Till Floats (no data model — deferred)
- Email Receipt edge function (requires email domain setup — can be added later, print receipt ships first)

