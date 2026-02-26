
Great prompt direction — you identified the right problem space (data gap vs UI rendering). A tighter prompt next time would specify scope as: “fix data retrieval + rendering + row-limit handling for Products by Stylist.”

## Goal
Make retail transaction data consistently appear in **Products by Stylist** using existing synced transaction data, with no false empty state.

## Findings (from code)
- `useServiceProductDrilldown` now fetches product data correctly.
- `ServiceProductDrilldown.tsx` still hardcodes product mode to always show:
  - “Product data not yet available” empty state.
- Product-mode row copy still says “service(s)” and includes tips text.
- Hook does not handle comma-separated multi-location IDs (region filter path).
- Hook queries are not paginated, so datasets over 1000 rows can silently truncate.

## Implementation Plan

1. **Fix product-mode rendering logic**
   - File: `src/components/dashboard/ServiceProductDrilldown.tsx`
   - Replace unconditional `!isServices` empty-state branch with:
     - show empty state only when `sorted.length === 0`
     - otherwise render list for both modes.
   - Keep service and product empty-state messages mode-specific.

2. **Fix mode-specific row labels**
   - File: `src/components/dashboard/ServiceProductDrilldown.tsx`
   - In product mode, change row subtitle to:
     - `{productCount} product(s) · {sharePercent}% of total`
   - Show tips only for services mode.

3. **Support multi-location filters in hook**
   - File: `src/hooks/useServiceProductDrilldown.ts`
   - Update location filter handling to support:
     - single ID via `.eq`
     - comma-separated IDs via `.in`
   - Apply same logic to both appointments and transaction-item queries.

4. **Add pagination for data integrity**
   - File: `src/hooks/useServiceProductDrilldown.ts`
   - Add `fetchAllPages` batching for:
     - `phorest_appointments`
     - `phorest_transaction_items`
   - Prevent 1000-row truncation from causing missing retail totals/staff rows.

5. **Stabilize date filtering**
   - File: `src/hooks/useServiceProductDrilldown.ts`
   - Normalize transaction date bounds to full-day timestamps for accuracy:
     - start `T00:00:00`
     - end `T23:59:59.999`
   - Keep appointment date filters as-is if date-only schema.

6. **Optional resilience layer (only if gaps persist)**
   - Add backend function fallback to provider reports endpoint for daily retail totals/staff splits when local transaction sync is temporarily stale.
   - Use only as secondary fallback; local synced transaction table remains primary source.

## Technical Details
- Keep tax-inclusive retail math everywhere in this flow:
  - `amount = total_amount + tax_amount`
- Preserve current output contract:
  - `staffData`, `totalServiceRevenue`, `totalProductRevenue`
- Maintain staff union merge behavior so product-only staff still render.

## Validation Checklist
- Open Products by Stylist with known product sales:
  - rows render (not empty message),
  - totals match expected tax-inclusive value.
- Test `All Locations`, specific location, and region-filtered (multi-ID) paths.
- Test high-volume date range to confirm no 1000-row clipping.
- Confirm service mode remains unchanged and still shows tips.
