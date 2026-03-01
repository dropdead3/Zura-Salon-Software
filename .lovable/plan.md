

## Redesign the Revenue Gap Drilldown for Clarity

### Problems with the current UI

1. **Client names show as "Walk-in"** — the hook reads `client_name` from `phorest_appointments` which is always null in your data. Names exist in `phorest_clients.name` but aren't being joined.

2. **Most "pricing variances" are actually missing POS records** — 94 variances totaling $12.8K in February, but most show `actual: 0` with no transaction at all. These aren't pricing discrepancies — they're appointments that completed but never got rung up (or the POS match failed). The UI doesn't clearly distinguish these.

3. **The three-category breakdown (Cancellations / No-shows / Pricing) buries the answer** — the user has to click three different rows and mentally piece together what happened. The real question is simpler: "Which appointments didn't turn into the revenue I expected, and why?"

### Proposed redesign: A single, clear variance list

Instead of three separate expandable categories, show **one unified list of every appointment that contributed to the gap**, each tagged with a reason badge. This makes the drilldown scannable at a glance.

#### 1. Fix client name resolution in `useRevenueGapAnalysis`

Join `phorest_appointments.phorest_client_id` → `phorest_clients.name` to get actual client names instead of relying on the always-null `client_name` field. Apply to cancellations, no-shows, AND completed appointments.

#### 2. Restructure the drilldown UI

Replace the three-category accordion with a single list:

```text
┌─────────────────────────────────────────────┐
│  WHERE THE GAP CAME FROM                    │
│                                             │
│  [Cancelled] Jane Smith                     │
│  Full Balayage · w/ Sarah    -$240          │
│                                             │
│  [No POS Record] Kaylee Baird               │
│  2 Row Initial Install · w/ Maria  -$300    │
│                                             │
│  [Discount] Nicole Dickerson                │
│  Partial Balayage  $185 → $150    -$35      │
│                                             │
│  [No-show] Walk-in                          │
│  Natural Root Retouch · w/ Amy   -$152      │
│                                             │
│  ... Show all 28 items                      │
│                                             │
│  ── Summary ──────────────────────          │
│  Cancellations (3)         -$620            │
│  No-shows (1)              -$152            │
│  No POS record (18)       -$2,400           │
│  Pricing differences (6)   -$210            │
└─────────────────────────────────────────────┘
```

Each row gets a color-coded reason badge:
- **Cancelled** (red) — appointment was cancelled
- **No-show** (amber) — client didn't show up
- **No POS record** (red/muted) — completed appointment with zero matching POS transactions
- **Service changed** (blue) — POS service differs from scheduled
- **Discount** (amber) — POS amount lower, discount flag present

The list is sorted by variance amount (largest first), capped at 10 items with "Show all" toggle. A compact summary row at the bottom breaks out totals by category.

#### 3. Files modified

| File | Change |
|---|---|
| `src/hooks/useRevenueGapAnalysis.ts` | Join `phorest_clients` for name resolution. Return a single unified `gapItems: GapItem[]` array combining all categories, each with a `reason` field (`'cancelled' | 'no_show' | 'no_pos_record' | 'service_changed' | 'discount' | 'pricing_diff'`). Keep the summary totals for the bottom row. |
| `src/components/dashboard/sales/RevenueGapDrilldown.tsx` | Replace three-category accordion with single sorted list. Each item shows client name, service, stylist, amount, and a reason badge. Add compact summary bar at bottom. |

### Technical details

- Client name query: `SELECT pc.name FROM phorest_clients pc WHERE pc.phorest_client_id = a.phorest_client_id` — done as a bulk lookup map, same pattern as staff mapping
- Unified `GapItem` type replaces `GapAppointment` + `PricingVarianceItem` — simpler data model
- Reason assignment logic: cancelled → `'cancelled'`, no-show → `'no_show'`, completed + no POS match → `'no_pos_record'`, completed + POS with discount → `'discount'`, completed + different service name → `'service_changed'`, completed + lower amount → `'pricing_diff'`
- Initial visible cap: 10 items (up from 5, since this is now the single list)

