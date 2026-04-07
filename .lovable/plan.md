

# Fix Revenue Calculation to Match POS Source of Truth

## Problem

DB investigation confirms the revenue mismatch:

| Metric | Zura (current) | Phorest | Source |
|---|---|---|---|
| Total Revenue | $4,872.00 | $3,881.40 | Zura uses `phorest_appointments.total_price`; Phorest uses transaction items (services + retail + tax) |
| Avg Ticket | $113.30 | $176.43 | Zura divides by 43 appointments; Phorest divides by 22 unique client visits |
| Services | (not shown separately) | $3,550.00 | Available in `phorest_transaction_items` |
| Retails | (not shown separately) | $331.40 | $306.00 + $25.40 tax |

**Root cause**: `useIndividualStaffReport` computes `totalRevenue` by summing `total_price` from `phorest_appointments` (lines 297-321). This field includes tips and other non-performance amounts. Phorest's "Performance Revenue" is strictly `service items + product items + tax` from transaction items.

**Avg Ticket root cause**: Zura divides total revenue by completed appointment count (36 completed → $4,872/43≈$113). Phorest divides by unique client visits (distinct `client_id + date` combos = 22 → $3,881.40/22 = $176.43).

## Fix

### File: `src/hooks/useIndividualStaffReport.ts`

**Revenue source switch** (lines 296-324):
- Replace `totalRevenue` calculation: instead of summing `total_price` from appointments, compute from transaction items:
  - `totalRevenue = serviceRevenue + productRevenue + taxTotal` (tax-inclusive, matching Phorest)
  - `serviceRevenue` = sum of `total_amount` where `item_type` is service
  - `productRevenue` = sum of `total_amount + tax_amount` where `item_type` is product (tax-inclusive retail)
- Keep tips from `phorest_appointments.tip_amount` (unchanged)
- Keep appointment counts from appointments table (unchanged)

**Avg Ticket fix** (line 324):
- Change from `totalRevenue / completed` to `totalRevenue / uniqueVisits`
- `uniqueVisits` = count of distinct `phorest_client_id + transaction_date` combos from transaction items

**Daily trend fix** (lines 318-320):
- Build `dailyRevMap` from transaction items (sum of `total_amount + tax_amount` per `transaction_date`) instead of appointment `total_price`

**Prior period revenue fix** (lines 328-333):
- Fetch prior + two-prior period transaction items (same batched pagination pattern)
- Compute `priorTotalRevenue` and `twoPriorTotalRevenue` from transaction items instead of appointments
- This fixes the multi-period trend comparison (line 578)

**Team averages fix** (lines 472-515):
- Fetch all staff transaction items for the period (not just appointments)
- Compute team revenue from transaction items to ensure team avg uses the same methodology

**Product revenue tax inclusion**:
- Update `productRevenue` to include `tax_amount` so retail matches Phorest's tax-inclusive display ($306 + $25.40 = $331.40)

### File: `src/components/dashboard/reports/IndividualStaffReport.tsx`

No structural changes needed — the KPI tiles already display `data.revenue.total`, `data.revenue.service`, `data.revenue.product`, `data.revenue.avgTicket`. The values will automatically correct once the hook returns accurate numbers.

Update the Avg Ticket tooltip from "Average revenue per completed appointment" to "Average revenue per client visit" to reflect the new calculation.

## Verification
After fix, for Gavin Eagan March 2026:
- Total Revenue: $3,881.40 (matches Phorest)
- Services: $3,550.00 (matches Phorest)
- Retails: $331.40 (matches Phorest, tax-inclusive)
- Avg Ticket: $176.43 (matches Phorest)
- Tips: $2,262.75 (from appointments, shown separately)

## Files Changed
| File | Change |
|---|---|
| `useIndividualStaffReport.ts` | Switch revenue from appointments to transaction items; fix avg ticket denominator; include tax in retail; fix prior periods and team averages |
| `IndividualStaffReport.tsx` | Update avg ticket tooltip text |

2 files, no database changes.

