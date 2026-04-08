

# POS-First Migration: Edge Functions (Phase 2)

The original plan listed 5 edge functions, but the full audit found **10 edge functions** still querying `phorest_daily_sales_summary`. Two are sync/migration functions (write-path, leave as-is). The remaining **8** need to switch to `phorest_transaction_items`.

## Pattern (same as client-side)

All edge functions will:
- Query `phorest_transaction_items` with `transaction_date` range filters
- Sum `total_amount + tax_amount`, split by `item_type` ('service' vs other)
- Use pagination (1000-row pages) for large date ranges
- Scope by `location_id` where applicable

## Files to Update

### 1. `supabase/functions/growth-forecasting/index.ts`
**Two locations:**
- **Line 192**: Main historical query — replace `phorest_daily_sales_summary` with `phorest_transaction_items`. Select `transaction_date, total_amount, tax_amount, item_type, location_id`. Paginate. Aggregate into same `monthMap` structure by computing `totalRevenue`, `serviceRevenue`, `productRevenue` from items.
- **Line 681**: Accuracy backfill query — same switch for period actuals lookup.

### 2. `supabase/functions/revenue-forecasting/index.ts`
- **Line 72**: Replace 90-day `phorest_daily_sales_summary` query with `phorest_transaction_items`. Aggregate to daily totals client-side for the forecasting model.

### 3. `supabase/functions/detect-anomalies/index.ts`
- **Lines 119-127**: Today's revenue — query `phorest_transaction_items` where `transaction_date = today`, sum `total_amount + tax_amount`.
- **Lines 134-142**: Last week comparison — same query for `lastWeekStr`.

### 4. `supabase/functions/calculate-org-benchmarks/index.ts`
- **Line 73**: Replace period revenue query with `phorest_transaction_items` filtered by `organization_id` (via join or location scope) and date range.

### 5. `supabase/functions/calculate-health-scores/index.ts`
- **Lines 188-200**: Replace both current-week and previous-week revenue queries with `phorest_transaction_items`, aggregating `total_amount + tax_amount`.

### 6. `supabase/functions/update-sales-leaderboard/index.ts`
- **Lines 43-55**: Replace weekly sales-by-stylist query with `phorest_transaction_items` using `stylist_user_id`. Join employee name from `employee_profiles` separately. Aggregate by `stylist_user_id`.

### 7. `supabase/functions/generate-daily-huddle/index.ts`
- **Lines 78-83**: Replace yesterday's sales summary with `phorest_transaction_items` for `transaction_date = yesterdayStr`. Aggregate to produce `total_revenue`, `service_revenue`, `product_revenue`.

### 8. `supabase/functions/ai-business-insights/index.ts`
- **Lines 118-124**: Replace 14-day sales query with `phorest_transaction_items`. Aggregate daily totals for AI context.

### 9. `supabase/functions/ai-card-analysis/index.ts`
- **Lines 133-140**: Revenue trend query — switch to `phorest_transaction_items`, aggregate by date.
- **Lines 177-181**: Location comparison query — switch similarly, group by `location_id`.

### 10. `supabase/functions/process-scheduled-reports/index.ts`
- **Lines 220-232**: Template-based report query — switch to `phorest_transaction_items`.
- **Lines 246-251**: Fallback report query — same switch.

## Not Changed (intentionally)
- `sync-phorest-data` — this is the function that *writes* to `phorest_daily_sales_summary`; it's the sync pipeline itself
- `migrate-phorest-data` — one-time migration utility

## Summary

| File | Change |
|---|---|
| `growth-forecasting/index.ts` | 2 queries (main historical + accuracy backfill) |
| `revenue-forecasting/index.ts` | 1 query (90-day historical) |
| `detect-anomalies/index.ts` | 2 queries (today + last week) |
| `calculate-org-benchmarks/index.ts` | 1 query (period revenue) |
| `calculate-health-scores/index.ts` | 2 queries (current + previous week) |
| `update-sales-leaderboard/index.ts` | 1 query (weekly by stylist) |
| `generate-daily-huddle/index.ts` | 1 query (yesterday's sales) |
| `ai-business-insights/index.ts` | 1 query (14-day sales) |
| `ai-card-analysis/index.ts` | 2 queries (trend + location) |
| `process-scheduled-reports/index.ts` | 2 queries (template + fallback) |

10 edge functions, no database changes. All deployed automatically after edit.

