

# Payment Operations — Location, Date Range & Status Filtering

## Current State
The Payment Ops page has 6 tabs (Payouts, Reconciliation, Deposit Holds, Refunds, Fee Charges, Disputes). None of the tabs support location filtering or date range filtering (except Reconciliation which has a single-date picker). Refunds show only `status = 'pending'`, Disputes show all with no status toggle, and Deposit Holds show only `deposit_status = 'held'`.

## Design

### Shared Filter Bar
Add a persistent filter bar below the page header (above the tabs) containing:
- **LocationMultiSelect** — uses the existing `LocationMultiSelect` component, filters all tabs by `location_id`
- **Date Range** — two date inputs (From / To), defaults to last 30 days; applies to Holds (by `appointment_date`), Refunds (by `created_at`), Fee Charges (by `created_at`), Disputes (by `created_at`)
- Reconciliation keeps its own single-date picker (unchanged)
- Payouts tab is Stripe-sourced (no location/date filter applies) — filters are visually hidden when Payouts is active

### Per-Tab Status Filters
- **Refunds**: Add status toggle pills (Pending / Processed / All) — currently hardcoded to `pending`
- **Disputes**: Add status toggle pills (Active / Resolved / All) — currently shows all with no filter
- **Deposit Holds**: Add status toggle (Held / Captured / Released / All) — currently hardcoded to `held`
- **Fee Charges**: Already has status toggle — no change needed

### Client Search
Add a search input in the filter bar that filters by client name across the active tab's data (client-side `.filter()` on the already-fetched rows).

## Implementation

### Filter State (in `PaymentOps` component)
```text
locationIds: string[]        // from LocationMultiSelect
dateFrom: string             // yyyy-MM-dd, default 30 days ago
dateTo: string               // yyyy-MM-dd, default today
clientSearch: string          // debounced, client-side filter
holdStatus: 'held' | 'captured' | 'released' | 'all'
refundStatus: 'pending' | 'processed' | 'all'
disputeStatus: 'active' | 'resolved' | 'all'
```

### Query Changes
Each tab's `useQuery` call gets updated to accept location + date range filters:

- **Deposit Holds**: Add `.in('location_id', ids)` (if not all), `.gte/.lte('appointment_date', ...)`, change `.eq('deposit_status', ...)` to use `holdStatus`
- **Refunds**: Add date range on `created_at`, change status filter to use `refundStatus` (or remove for 'all')
- **Fee Charges**: Add `.in('location_id', ids)` via a join on `appointment_id → appointments.location_id`, add date range on `created_at`
- **Disputes**: Add date range on `created_at`, add status grouping (`active` = `needs_response`/`under_review`/`warning_needs_response`, `resolved` = `won`/`lost`/`charge_refunded`)

### Client Search
Applied client-side via `useMemo` filtering on the rendered list for each tab (`client_name.toLowerCase().includes(search)`).

## Files

| File | Action |
|---|---|
| `src/pages/dashboard/admin/PaymentOps.tsx` | Add filter bar with LocationMultiSelect, date range, search input. Add status toggles to Refunds/Disputes/Holds tabs. Pass filters into all queries. |

Single file change. No migrations. No edge function changes. No new dependencies — uses existing `LocationMultiSelect`, `useLocations`, `useDebounce`, and `date-fns`.

