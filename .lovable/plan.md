

## Fix Dollar Amount Overflow in Bar Chart Panels

### Problem
The value column is set to a fixed `90px` width, which isn't wide enough for larger formatted amounts like `$5,842.00`. Text spills out of view.

### Solution
Widen the value column from `90px` to `110px` across all four bar-chart panels. This accommodates amounts up to `$99,999.00` comfortably.

### Changes

**1. `src/components/dashboard/sales/CategoryBreakdownPanel.tsx`**
- Line 98: `grid-cols-[28px_1fr_48px_90px]` → `grid-cols-[28px_1fr_48px_110px]`
- Line 99: `grid-cols-[140px_1fr_48px_90px]` → `grid-cols-[140px_1fr_48px_110px]`

**2. `src/components/dashboard/sales/RevPerHourByStylistPanel.tsx`**
- Widen the value column from `80px` → `100px`

**3. `src/components/dashboard/sales/TicketDistributionPanel.tsx`**
- No value column to fix (count-based), but verify no clipping on the count column

**4. `src/components/dashboard/sales/TransactionsByHourPanel.tsx`**
- Verify count column width is sufficient

### What stays the same
- Grid structure, animations, hover states, BlurredAmount wrapping — all unchanged

