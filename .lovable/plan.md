

# Redesign Payment Operations with Tabs

## Current State
The page stacks 5 sections vertically as collapsible/static cards: Payouts & Balance, Till Reconciliation, Active Deposit Holds, Pending Refunds, and Fee Charges. This creates a long scrolling page where operators must hunt for the section they need.

## New Design
Replace the stacked cards with a tabbed layout using the existing `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` components. Each section becomes its own tab panel.

**Tabs:**
1. **Payouts** — Balance cards + payout history (or inactive notice)
2. **Reconciliation** — Till reconciliation with date picker + results
3. **Deposit Holds** — Active pre-authorized holds table
4. **Refunds** — Pending refund queue
5. **Fee Charges** — Fee ledger (the existing `FeeLedgerCard` content)

Each tab trigger gets a count badge where applicable (e.g., deposit holds count, pending refunds count, pending fees count).

**Layout:**
- `DashboardPageHeader` stays as-is at the top
- Below it, a single `Tabs` component with `ResponsiveTabsList` (handles overflow on smaller screens)
- Each `TabsContent` renders the same content currently inside each card's `CardContent`, but without the outer `Card` / `CardHeader` wrapper (the tab label replaces the card title)
- Wrap each tab's content in a single `Card` for consistent styling

## Changes

### `src/pages/dashboard/admin/PaymentOps.tsx`
- Import `Tabs, TabsTrigger, TabsContent` and `ResponsiveTabsList`
- Replace `<div className="space-y-6">` with `<Tabs defaultValue="payouts">`
- Move each section's content into a `TabsContent`
- Add badge counts to tab triggers for actionable items
- Remove `Collapsible` wrapper from Payouts section (tabs replace collapsible)
- Keep all existing state, hooks, queries, and dialogs unchanged — only the layout wrapper changes

No other files modified. No migrations. No edge function changes.

| File | Action |
|------|--------|
| `src/pages/dashboard/admin/PaymentOps.tsx` | Restructure layout from stacked cards to tabbed interface |

