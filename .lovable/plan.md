

# Batch Feature Build — 9 Features for Zura Backroom

These 9 features span waste analytics, financial reporting, purchasing intelligence, forecasting, mobile optimization, formula collaboration, and automation. Grouped by effort and dependency.

---

## Feature 4 & 13: Waste Reason Codes + Waste Category Breakdown

These are essentially the same feature. Waste categories **already exist** as a DB enum (`waste_category`) with 5 values: `leftover_bowl_waste`, `overmix_waste`, `spill_waste`, `expired_product_discard`, `contamination_discard`. The `WasteRecordDialog` already lets users pick a category.

**What's missing:** A `notes` field on waste events is supported in DB but not surfaced in the dialog, and there's no **analytics breakdown by category** in the Command Center.

### Changes
1. **`WasteRecordDialog.tsx`** — Add an optional "Reason / Notes" text field below the category dropdown
2. **New: `WasteCategoryBreakdownCard.tsx`** — Donut chart + table showing waste by category (g and $), surfaced in the Analytics sub-tab of Command Center
3. **`useBackroomAnalytics.ts`** — Already aggregates `wasteByCategory`; expose this data to the new card
4. **Migration** — Add two new enum values: `wrong_mix` and `client_refusal` to `waste_category` enum for completeness

---

## Feature 6: Service-Level P&L Report

A `ProfitByServiceTable` and `AppointmentProfitCard` already exist in `src/components/dashboard/backroom/appointment-profit/`. The `appointment-profit-engine` calculates revenue, chemical cost, labor cost, and margin per service.

**What's missing:** An exportable summary view and a dedicated P&L sub-tab.

### Changes
1. **New: `ServicePLReport.tsx`** — Tabular P&L layout: Service Name | Revenue | Product Cost | Est. Labor | Gross Margin | Margin % with totals row, date range filter, and CSV export button
2. **Wire into Analytics sub-tab** of BackroomDashboardOverview, alongside existing profit cards
3. **CSV export utility** — Simple function to convert the table data to downloadable CSV

---

## Feature 7: Inventory Valuation Report

An `InventoryValuationCard` already exists in `src/components/dashboard/analytics/` for retail. The backroom needs its own version scoped to professional products.

### Changes
1. **New: `BackroomInventoryValuationCard.tsx`** — Shows total inventory at cost, at retail, implied margin %, grouped by brand and by location. Includes CSV export.
2. **Data source** — Query `products` + `inventory_projections` for professional products (where `is_professional = true` or category in color/developer/etc.)
3. **Wire into** Command Center Analytics sub-tab

---

## Feature 8: MOQ Validation on PO Creation

MOQ is already stored on `product_suppliers.moq` and `vendor_products.moq`. The `check-reorder-levels` edge function already respects MOQ when calculating suggested quantities. But the **PO Builder UI** doesn't warn when a manual line is below MOQ.

### Changes
1. **`POBuilderPanel.tsx`** — When user enters/edits a quantity on a PO line, compare against the product's supplier MOQ. Show inline amber warning badge: "Below MOQ (min: X)" if qty < moq
2. **`useReplenishment.ts`** — Already fetches `vendor_products.moq`; ensure this data is available in the PO builder context

---

## Feature 9: Seasonal Demand Patterns

The predictive backroom currently uses recent usage history (last 30-90 days). Adding a year-over-year overlay would improve accuracy.

### Changes
1. **`predictive-backroom-service.ts`** — Add a `fetchHistoricalUsageSameWeekLastYear()` function that queries mix sessions from the same calendar week 52 weeks ago. Blend with recent velocity (weighted: 70% recent, 30% YoY if available).
2. **New: `SeasonalDemandOverlay.tsx`** — Small chart card in the Command Center Analytics sub-tab showing current week usage vs same week last year for top 10 products. Simple bar comparison.
3. **Graceful degradation** — If org has < 12 months of data, hide the overlay and don't blend YoY into forecasts.

---

## Feature 11: Backroom Mobile View Optimization

The mixing workflow happens at stations, often on tablets. Key touch targets and layouts need auditing.

### Changes
1. **`MixSessionManager.tsx`** — Add responsive classes: stack bowl cards vertically on `< md`, increase touch targets on buttons to min 44px
2. **`BowlCard.tsx`** — Responsive product line layout: two-column on desktop, single-column stack on mobile with larger tap targets
3. **`WasteRecordDialog.tsx`** — Full-screen sheet on mobile (`< sm`) instead of centered dialog
4. **`ManualWeightInput.tsx`** — Larger number input and +/- buttons on mobile (min 48px touch)
5. **General** — Audit key backroom components for `min-h-[44px]` on interactive elements, add `@container` queries where beneficial

---

## Feature 12: Formula Sharing Between Stylists

Currently formulas are resolved per-client or per-stylist. No mechanism to share a formula with a colleague.

### Changes
1. **Migration** — New table `shared_formulas`:
   ```sql
   CREATE TABLE shared_formulas (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
     formula_history_id UUID NOT NULL REFERENCES client_formula_history(id) ON DELETE CASCADE,
     shared_by UUID NOT NULL REFERENCES auth.users(id),
     shared_with UUID NOT NULL REFERENCES auth.users(id),
     client_id UUID NOT NULL,
     notes TEXT,
     created_at TIMESTAMPTZ DEFAULT now(),
     UNIQUE(formula_history_id, shared_with)
   );
   ```
   With RLS: org members can view their own shared formulas.
2. **New: `useSharedFormulas.ts`** — Hook to create/query shared formulas
3. **`InstantFormulaCard.tsx`** — Add a "Share with stylist" button (icon) that opens a staff picker dialog
4. **New: `ShareFormulaDialog.tsx`** — Staff selector + optional notes field
5. **Formula resolver** — Add shared formulas as a new tier in the hierarchy (after client history, before service baseline)

---

## Feature 14: Automatic Reorder with Approval Gate

The `check-reorder-levels` edge function already supports `auto_create_draft_po` and `auto_reorder_enabled` with `max_auto_reorder_value` spend cap. Draft POs are created automatically.

**What's missing:** A manager approval gate before drafts are sent to suppliers, and push notification to managers.

### Changes
1. **`AlertSettingsCard.tsx`** — Add "Require manager approval before sending auto-generated POs" toggle (new column `require_po_approval` on `inventory_alert_settings`)
2. **Migration** — Add `require_po_approval boolean NOT NULL DEFAULT true` to `inventory_alert_settings`
3. **`ReorderApprovalCard.tsx`** — Already shows draft POs with approve/reject. Enhance with batch approve, spend summary, and "Auto-generated" badge
4. **Control Tower integration** — Add a new alert type "POs Awaiting Approval" to surface pending drafts prominently
5. **`check-reorder-levels` edge function** — When `require_po_approval` is true, create POs as `draft` status (already does this). When false, auto-set to `sent` and trigger email.

---

## Summary of New Files

| File | Feature |
|------|---------|
| `src/components/dashboard/backroom/WasteCategoryBreakdownCard.tsx` | 4 & 13 |
| `src/components/dashboard/backroom/ServicePLReport.tsx` | 6 |
| `src/components/dashboard/backroom/BackroomInventoryValuationCard.tsx` | 7 |
| `src/components/dashboard/backroom/SeasonalDemandOverlay.tsx` | 9 |
| `src/components/dashboard/backroom/ShareFormulaDialog.tsx` | 12 |
| `src/hooks/backroom/useSharedFormulas.ts` | 12 |

## Migrations (3)
1. Add `wrong_mix`, `client_refusal` to `waste_category` enum
2. Create `shared_formulas` table with RLS
3. Add `require_po_approval` to `inventory_alert_settings`

## Existing Files Modified (~15)
- `WasteRecordDialog.tsx`, `useBackroomAnalytics.ts`, `BackroomDashboardOverview.tsx`, `POBuilderPanel.tsx`, `predictive-backroom-service.ts`, `MixSessionManager.tsx`, `BowlCard.tsx`, `ManualWeightInput.tsx`, `InstantFormulaCard.tsx`, `formula-resolver.ts`, `AlertSettingsCard.tsx`, `ReorderApprovalCard.tsx`, `check-reorder-levels/index.ts`

