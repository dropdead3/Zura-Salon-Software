

# Make Yearly Impact Section Scale for Large Numbers

The 3-column grid with `text-base` font breaks when values hit 6-7 digits (e.g. `$1,234,567`). The fix is to use compact notation and responsive sizing.

## Changes (`BackroomPaywall.tsx`)

### 1. Use compact formatting for the 3-column KPIs (lines 316-335)
- Add `formatOptions` to each `AnimatedNumber` to use compact notation (`notation: 'compact'`) so large values render as `$43.1K`, `$1.2M` etc.
- Reduce font from `text-base` to `text-sm` for extra safety margin

### 2. Hero annual number (line 354-356)
- Apply compact notation on the hero `AnimatedNumber` as well — switch from bare `prefix="$"` to `formatOptions={{ style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 0 }}` so `$1,234,567` renders as `$1.2M`
- Remove the manual `$` prefix since the format options handle it
- Keep `text-3xl` — compact notation keeps it short enough

### 3. Subscribe button (line 377)
- Already uses `formatCurrency(monthlyTotal)` which handles large numbers fine — no change needed

