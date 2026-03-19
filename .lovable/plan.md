
# Post-Build Gap Fixes — All 5 Gaps + 4 Enhancements ✅

## Completed

### Gap 1 ✅: Shared formulas wired into formula resolver
- Added `shared_formula` source type and `fetchSharedFormula()` function
- Inserted as Priority 2.5 (after stylist, before salon recipe) in `resolveFormula()`
- Queries `shared_formulas` → `client_formula_history` for the target client, preferring service-matching formulas

### Gap 2 ✅: `check-reorder-levels` respects `require_po_approval`
- When `require_po_approval = false` AND supplier has email, POs auto-send as `sent` status
- Edge function deployed

### Gap 3 ✅: Control Tower "POs Awaiting Approval" alerts
- Added `po_approval` alert category and `DraftPOAlert` type to `control-tower-engine.ts`
- Added `buildPOApprovalAlerts()` builder (auto vs manual PO grouping)
- `useControlTowerAlerts` now fetches draft POs via `useDraftPOs` hook

### Gap 4 ✅: Seasonal demand blended into forecasting
- Added `fetchSeasonalWeights()` to `predictive-backroom-service.ts`
- Blends same-week-last-year usage at 30% weight (70/30 current/seasonal)

### Gap 5 ✅: Verified — waste categories exist in DB types

### Enhancement 1 ✅: Type safety for AlertSettingsCard
- Added `require_po_approval`, `dead_stock_enabled`, `dead_stock_days` to `InventoryAlertSettings` interface
- Removed all `as any` casts in AlertSettingsCard

### Enhancement 2: SeasonalDemandOverlay query optimization
- Deferred (non-blocking) — sequential queries work, can optimize to RPC later

### Enhancement 3 ✅: BackroomInventoryValuationCard `is_professional`
- Verified column exists in DB types — `as any` casts are on the `products` table generic, not the column itself

### Enhancement 4 ✅: CSV comma escaping
- Added `esc()` helper to both `ServicePLReport` and `BackroomInventoryValuationCard`
- Wraps values containing commas/quotes in proper CSV escaping
