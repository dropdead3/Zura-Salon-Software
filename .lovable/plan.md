

## Root Cause: Location ID Mismatch

The "By Location" section shows `$0.00` because of an **ID namespace mismatch** between two data sources:

| Table | `location_id` format | Example |
|-------|---------------------|---------|
| `phorest_appointments` | App location ID | `val-vista-lakes` |
| `phorest_transaction_items` | Phorest branch ID | `6YPlWL5os-Fnj0MmifbvVA` |
| `phorest_daily_sales_summary` | Phorest branch ID | `6YPlWL5os-Fnj0MmifbvVA` |

The `useSalesByLocation` hook (which builds the location list) uses `locations.id` as keys (`val-vista-lakes`). But `useTodayActualRevenue` queries POS tables, so `locationActuals` is keyed by Phorest branch IDs (`6YPlWL5os-Fnj0MmifbvVA`). When the card does `locationActuals["val-vista-lakes"]`, it finds nothing — so everything shows `$0.00`.

## Fix

**Edit `src/hooks/useTodayActualRevenue.tsx`** — in the `locationActualRevenueQuery` (and the location last-appointment query), resolve Phorest branch IDs back to app location IDs:

1. Fetch the `locations` table mapping (`phorest_branch_id` → `id`) at the start of the query function
2. When building the `byLocation` map, use the resolved app location ID as the key instead of the raw Phorest branch ID
3. Apply the same mapping in the `locationLastApptQuery`

This ensures `locationActuals` is keyed by `val-vista-lakes` / `north-mesa`, matching what `AggregateSalesCard` looks up.

### Files Changed
- **Edit**: `src/hooks/useTodayActualRevenue.tsx` — add location ID resolution in both `locationActualRevenueQuery` and `locationLastApptQuery`

