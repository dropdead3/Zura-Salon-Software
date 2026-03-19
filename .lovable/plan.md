

# Post-Build Analysis: 9 Features — Gaps & Enhancements

All 9 features are structurally in place, but there are **5 real gaps** and **4 recommended enhancements**.

---

## GAPS (Need Fixing)

### Gap 1: Formula Resolver not wired to shared formulas
The plan called for adding shared formulas as a new tier in the resolution hierarchy (after client history, before service baseline). **This was never done.** `formula-resolver.ts` still has only the original 3-priority chain. Shared formulas are stored and displayed but never surfaced when resolving a formula for a new mix session.

**Fix:** Add a Priority 2.5 step in `resolveFormula()` that queries `shared_formulas` for the given client + service before falling back to salon recipe.

### Gap 2: `check-reorder-levels` edge function not updated for `require_po_approval`
The plan called for the edge function to respect the `require_po_approval` setting — when false, auto-set POs to `sent` and trigger email. **No changes were made to the edge function.** It still always creates `draft` POs regardless of the setting.

**Fix:** In the edge function, after creating a draft PO, check `require_po_approval`. If false, immediately update status to `sent` and trigger the supplier email.

### Gap 3: Control Tower missing "POs Awaiting Approval" alert type
The plan called for a new alert category in the Control Tower for pending draft POs. **This was never added** to `control-tower-engine.ts`. The `ReorderApprovalCard` exists standalone but isn't surfaced as a priority alert.

**Fix:** Add a `po_approval` alert builder in `buildControlTowerAlerts()` that checks for draft POs with `import_source = 'auto_reorder'` and surfaces them as medium-priority alerts.

### Gap 4: Seasonal demand not blended into predictive forecasting
The plan called for blending YoY usage (70/30 weight) into `predictive-backroom-service.ts`. **No changes were made** — the `SeasonalDemandOverlay` card queries and displays data independently, but the actual forecast engine still uses only recent velocity.

**Fix:** In the demand forecasting function, fetch same-week-last-year usage and blend at 30% weight when available.

### Gap 5: `WasteRecordDialog` notes field was already there
The plan noted the dialog needed a notes field added. Looking at the existing code, the dialog already had a notes `Textarea` before our changes. **No gap here — this is fine.** However, the new `wrong_mix` and `client_refusal` categories were correctly added to the TypeScript types and labels but need verification that the DB enum migration actually landed.

**Verification needed:** Confirm the `ALTER TYPE waste_category ADD VALUE` migration executed successfully.

---

## ENHANCEMENTS (Polish)

### Enhancement 1: `AlertSettingsCard` uses `(settings as any)` for new fields
The `require_po_approval`, `dead_stock_enabled`, `dead_stock_days` fields are accessed via `as any` casts because the `InventoryAlertSettings` interface in `useInventoryAlertSettings.ts` doesn't include them. Should add these fields to the interface for type safety.

### Enhancement 2: `SeasonalDemandOverlay` makes 3+ sequential DB queries
The card fires separate queries for session IDs → bowl IDs → bowl lines, twice (this week + last year = 6 queries). This could be slow. Consider a single RPC or at minimum batch the two weeks in parallel.

### Enhancement 3: `BackroomInventoryValuationCard` uses `is_professional` column
The query filters on `is_professional = true`, but uses `as any` casts. Should verify this column exists on the products table and is typed correctly.

### Enhancement 4: CSV exports don't escape commas in values
Both `ServicePLReport` and `BackroomInventoryValuationCard` use simple `.join(',')` for CSV. If a brand name or service name contains a comma, the CSV will break. Should wrap string values in quotes.

---

## Summary

| # | Feature | Status | Gap? |
|---|---------|--------|------|
| 4+13 | Waste Categories + Breakdown | Complete | Verify enum migration |
| 6 | Service P&L Report | Complete | CSV escaping |
| 7 | Inventory Valuation | Complete | CSV escaping, `as any` |
| 8 | MOQ Validation | Complete | None |
| 9 | Seasonal Demand | Partial | Not blended into forecasts |
| 11 | Mobile Optimization | Complete | None |
| 12 | Formula Sharing | Partial | Not wired into resolver |
| 14 | Auto-Reorder Approval | Partial | Edge fn + Control Tower missing |

**Recommended priority:**
1. Wire shared formulas into the formula resolver (Gap 1)
2. Update `check-reorder-levels` edge function for `require_po_approval` (Gap 2)
3. Add Control Tower alert for pending PO approvals (Gap 3)
4. Blend seasonal data into forecast engine (Gap 4)
5. Fix type safety + CSV escaping (Enhancements 1-4)

