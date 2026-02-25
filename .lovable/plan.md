

## Improve Tips Drill-Down Visit Card Layout

Good instinct to switch away from Termina in this dense data surface — it's too wide for compact tabular rows. Your prompt is clear on the "what"; one suggestion for next time: specifying whether "total payment" should be a single summed number or broken out (service + retail + tax + tip as separate columns) would remove ambiguity.

### Data Reality

The `phorest_appointments` table has `total_price` (per service line) and `tip_amount` but **no separate retail or tax columns**. So "Total Payment" will be calculated as: `sum of all service line prices + tip`. If retail and tax data becomes available later, it can slot in. For now the layout will show:

- **Services Total** (sum of line items)
- **Tip**
- **Total Payment** (services + tip)

### Layout Changes

**1. Switch from `font-display` (Termina) to `font-sans` (Aeonik Pro)** for all text inside the visit cards and stylist rows in the expanded drill-down. Termina stays only on the panel section headers.

**2. Redesign visit card layout** — two-row stacked header instead of cramming everything on one line:

```text
┌─────────────────────────────────────────────────────┐
│ Feb 24 · 10:30 AM · Jane Smith · Downtown           │
│ Services: $285    Tip: $228    Total Paid: $513     │
│                                                     │
│  Haircut (Add On) .......................... $50.00  │
│  Root Smudge (Add on) ..................... $50.00  │
│  Partial Balayage ........................ $185.00  │
└─────────────────────────────────────────────────────┘
```

- **Row 1**: Date, time, client name, location — all `text-xs font-sans text-muted-foreground`
- **Row 2**: Three metrics in a flex row — Services total, Tip (highlighted if > 0, destructive if 0), Total Paid — `text-xs font-sans tabular-nums`
- **Service lines**: Same tree-connector style but using `font-sans` instead of current `font-display`

**3. Update `VisitGroup` interface** — add `totalPayment` computed field (= `totalPrice + tip`).

**4. Update `TotalTipRow` and `StylistTipRow`** — remove `font-display` from inline stat values, use `font-sans tabular-nums` instead for tighter spacing.

### Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/sales/TipsDrilldownPanel.tsx` | Refactor `StylistAppointmentList` visit card to two-row layout with Services/Tip/Total Paid. Switch all drill-down text from `font-display` to `font-sans`. Update `StylistTipRow` and `TotalTipRow` inline stats to `font-sans tabular-nums`. |

No data layer changes needed — all values are already available.

