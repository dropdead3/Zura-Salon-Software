

# Fix Gap Analysis: Walk-in Labels and Status Display

## Two Bugs

### Bug 1: All non-terminal appointments show "In progress"
The hook groups booked/confirmed/pending/arrived/started into one `not_concluded` reason. The UI maps that to a single "In progress" badge. The actual appointment status is never passed to `GapItem`.

### Bug 2: Client name resolution missing first_name/last_name fallback
The `phorest_clients` lookup (line 135) only fetches `name`, not `first_name`/`last_name`. For 5 client IDs today that exist in appointments but not in `phorest_clients`, names can't resolve. The backfill migration fixed most (~40 of 42 today), but the hook's inline resolution should also use `first_name || last_name` as fallback.

## Plan

### 1. Add `status` field to `GapItem` interface
**File**: `src/hooks/useRevenueGapAnalysis.ts`
- Add `status?: string` to the `GapItem` interface
- Pass `a.status` when building gap items for `notConcluded` (line 193-203), cancelled, no-show, and completed entries

### 2. Expand `phorest_clients` lookup to include first/last name
**File**: `src/hooks/useRevenueGapAnalysis.ts` (line 135)
- Change `.select('phorest_client_id, name')` → `.select('phorest_client_id, name, first_name, last_name')`
- Update the map builder (line 137-139) to use `c.name || (c.first_name + ' ' + c.last_name).trim()` as resolved name

### 3. Display actual appointment status in the drilldown UI
**File**: `src/components/dashboard/sales/RevenueGapDrilldown.tsx`
- Replace the single `not_concluded` config with a status-aware badge renderer
- Map actual statuses to appropriate labels:
  - `booked` → "Booked" (blue badge)
  - `confirmed` → "Confirmed" (emerald badge)
  - `pending` → "Unconfirmed" (amber badge)
  - `arrived` → "Arrived" (teal badge)
  - `started` → "In progress" (emerald badge, current style)
- Keep `not_concluded` as fallback for unknown statuses
- The badge reads from `item.status` when available, falls back to `REASON_CONFIG[item.reason].label`

### 4. No database changes needed
The backfill migration already resolved most client names. The view already joins `phorest_clients`. These are purely client-side rendering fixes.

## Summary

| Type | Detail |
|------|--------|
| Files modified | 2 (`useRevenueGapAnalysis.ts`, `RevenueGapDrilldown.tsx`) |
| Bugs fixed | 2 (status display, name fallback) |
| Database changes | None |

