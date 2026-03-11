

## Sales Analytics — Issues Found Across Time Range Filters

After thorough investigation, I found **3 bugs** in the Sales Overview card affecting non-today date ranges:

### Bug 1: `useActualRevenue` ignores location filter (Critical)

The `useActualRevenue` hook (used for hero revenue + all sub-metrics when `isPastRange`) queries `phorest_daily_sales_summary` and `phorest_transaction_items` **without any location filter**. When a user selects a specific location via `filterContext.locationId`, the POS actuals show org-wide data while other components (scheduled revenue, leaderboard, trend) are location-scoped.

**Fix**: Add `locationId` parameter to `useActualRevenue` and apply `.eq('location_id', locationId)` on both queries.

### Bug 2: `useActualRevenue` has no row-limit handling (Data truncation)

The primary query on `phorest_daily_sales_summary` and the fallback on `phorest_transaction_items` both use default Supabase limits (1000 rows). For multi-day ranges (7d, 30d, MTD, YTD), daily summaries can exceed 1000 rows (days × staff members), and transaction items will easily exceed 1000. This silently truncates data, producing lower-than-actual revenue totals.

**Fix**: Use the existing `fetchAllBatched` utility (already in `useSalesData.ts`) or implement pagination in `useActualRevenue` to fetch all rows.

### Bug 3: Ranges including today mix stale POS with live data

Ranges like `7d`, `thisWeek`, and `mtd` include today in their date span. `isPastRange` is `true` for these, so the card displays POS actuals. But today's POS data may not be synced yet, meaning today's revenue is partially or fully missing from the POS totals — while the "Scheduled" badge correctly includes today's appointments. This creates a misleading gap.

**Fix**: For ranges that include today (where `dateTo === today`), either:
- Exclude today from the POS query and add today's live actual from `useTodayActualRevenue`, OR
- Show a "Includes today — may be incomplete" indicator

The cleanest approach is option A: split the query so historical days use POS and today uses the existing live hook.

---

### Implementation Plan

**File 1: `src/hooks/useActualRevenue.ts`**
- Add `locationId?: string` parameter
- Add location filter to both `phorest_daily_sales_summary` and `phorest_transaction_items` queries
- Add batch fetching (pagination) to handle >1000 rows

**File 2: `src/components/dashboard/AggregateSalesCard.tsx`**
- Pass `filterContext?.locationId` to `useActualRevenue` call (~line 274)
- For ranges where `dateTo === today`, combine `pastActual` (excluding today) with `todayActual` for a complete picture — adjust `dateFilters` passed to `useActualRevenue` to end at yesterday, then sum today's live data on top
- Update query key to include locationId for proper cache invalidation

**File 3 (minor)**: Update `useSalesComparison.ts` — already has location filter, no changes needed.

### Impact
- Fixes incorrect totals when a single location is selected
- Fixes silently truncated data on longer date ranges (30d, YTD)
- Fixes incomplete data for ranges that span into today

