

# Section 11 — Smart Inventory Intelligence

## Goal
Add subtle secondary intelligence data per row: **days remaining** (from usage velocity) and **daily usage rate**. Displayed as secondary text beneath or beside existing data — no new columns, no clutter.

## Approach

### 1. Create `useInventoryIntelligence` hook
**New file**: `src/hooks/backroom/useInventoryIntelligence.ts`

- Queries `stock_movements` for trailing 28-day usage (reason IN `'usage'`, `'dispensing'`, `'sold'`)
- Returns a `Map<string, { dailyUsage: number; daysRemaining: number }>` keyed by product ID
- Reuses the same calculation logic as `useInventoryDaysRemaining` but returns a Map for O(1) lookup per row
- `staleTime: 10min`, `enabled: !!orgId`

### 2. Wire into StockTab
- Call `useInventoryIntelligence(locationId)` in `StockTab.tsx`
- Pass the intelligence map down through `SupplierSection` → `CategoryGroup` → `CommandCenterRow` as a single prop: `intelligence?: { dailyUsage: number; daysRemaining: number }`

### 3. Display in CommandCenterRow
Two subtle additions, no new columns:

**A) Under the Product name** (in the existing name cell):
- Show days remaining as a tiny label: `"~14d remaining"` in `text-[10px] text-muted-foreground/50`
- Color-coded: `text-destructive/60` if < 7 days, `text-warning/60` if < 14 days, default muted otherwise
- Only shown when `dailyUsage > 0` (skip for products with no usage data)

**B) Under the Stock number** (in the existing stock cell):
- Show daily usage rate: `"0.8/day"` in `text-[10px] text-muted-foreground/40`
- Only shown when `dailyUsage > 0`

### 4. Expand row enhancement
- Add "Avg Daily Usage" and "Days Remaining" as `DetailEditCell`-style read-only items in the expandable detail row (non-editable, just display)

## Files Changed
| File | Change |
|------|--------|
| `src/hooks/backroom/useInventoryIntelligence.ts` | **New** — lightweight usage velocity hook |
| `src/components/dashboard/backroom-settings/inventory/StockTab.tsx` | Import hook, pass data down |
| `src/components/dashboard/backroom-settings/inventory/CommandCenterRow.tsx` | Accept + render intelligence data |

