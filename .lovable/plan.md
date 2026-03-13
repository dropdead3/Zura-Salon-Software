

# Close All Backroom Gaps — Implementation Plan

## Scope

Build the 7 remaining placeholder settings sections plus the additional enhancements identified. All database tables already exist (`allowance_buckets`, `backroom_alert_rules`, `backroom_pricing_display_rules`, `backroom_settings`, `backroom_stations`). All existing hooks (`useServiceAllowancePolicies`, `useBackroomStations`, `useInventoryAlertSettings`, `useSmartMixAssist`, `useBackroomSettings`, `useDashboardVisibility`) will be reused. No new migrations needed.

## What Gets Built

### 1. Allowances & Billing Section
**Component:** `AllowancesBillingSection.tsx`
- List all `service_allowance_policies` with inline edit
- Per-policy: manage `allowance_buckets` (add/edit/delete buckets)
- Bucket form: name, mapped categories/products, included qty/unit, overage rate/type/cap, billing label, taxable, manager override, min threshold, rounding rule
- Pricing display rules: manage `backroom_pricing_display_rules` per service (display mode, label, staff/client visibility, auto-insert, waive/edit, tax)
- Plain-English rule summary (e.g., "Full Highlight includes 180g before overage at $0.40/g")
- **Hooks:** New `useAllowanceBuckets.ts` (CRUD for `allowance_buckets`), new `usePricingDisplayRules.ts` (CRUD for `backroom_pricing_display_rules`). Reuses existing `useServiceAllowancePolicies`.

### 2. Stations & Hardware Section
**Component:** `StationsHardwareSection.tsx`
- List/create/edit stations via existing `useBackroomStations`
- Add update/delete mutations (currently only create exists)
- Fields: station name, location, device ID, scale ID, active toggle
- Show last seen timestamp
- **Hook changes:** Add `useUpdateBackroomStation` and `useDeleteBackroomStation` to existing `useBackroomStations.ts`

### 3. Inventory & Replenishment Section
**Component:** `InventoryReplenishmentSection.tsx`
- Org-level inventory settings via `backroom_settings` (key-value): tracking enabled, reorder cycle days, default lead time, forecast participation
- Per-product overrides: reorder point, safety stock, lead time, min order qty, preferred vendor
- Location override support via `backroom_settings` with location_id
- Reuses existing `useBackroomSettings` hook + `useInventoryAlertSettings`
- Alert threshold config (low stock %, stockout alerts)

### 4. Permissions Section
**Component:** `BackroomPermissionsSection.tsx`
- Role × permission matrix using `backroom_settings` (key: `backroom_permissions`, value: JSON permission map)
- Roles: owner, manager, inventory_manager, front_desk, stylist, assistant, independent_stylist, booth_renter
- Permissions: view_backroom, mix_bowls, smart_mix_assist, formula_memory, assistant_prep, approve_assistant, view_costs, view_charges, override_charges, waive_overage, edit_inventory, perform_counts, receive_po, resolve_exceptions, configure_settings
- Checkbox grid with role columns and permission rows
- Save via `useUpsertBackroomSetting`

### 5. Alerts & Exceptions Section
**Component:** `AlertsExceptionsSection.tsx`
- CRUD for `backroom_alert_rules` table
- Rule types: missing_reweigh, usage_variance, negative_inventory, waste_spike, stockout_risk, profitability, assistant_workflow
- Per rule: threshold value/unit, severity (info/warning/critical), creates exception, creates task, notify roles, active toggle
- Location-specific overrides supported via nullable `location_id`
- **Hook:** New `useBackroomAlertRules.ts`

### 6. Formula Assistance Section
**Component:** `FormulaAssistanceSection.tsx`
- Wraps existing `useSmartMixAssistSettings` for enable/disable + ratio lock
- Disclaimer text configuration via `backroom_settings` (key: `formula_disclaimer`)
- Default disclaimer text pre-populated
- Formula recall behavior settings (key: `formula_recall_config`)
- Suggestion hierarchy config (client history → stylist most recent → recipe baseline)
- Acknowledgment tracking (already in smart_mix_assist_settings)

### 7. Multi-Location Section
**Component:** `MultiLocationSection.tsx`
- Show org defaults vs location overrides side by side
- List all `backroom_settings` entries, grouped by key, showing which locations have overrides
- "Copy settings" action: duplicate all settings from one location to another
- "Reset to org default" action: delete location override
- Location picker using existing `useLocations` hook
- Compare mode: select 2 locations, show diff of overridden keys

## File Structure

```
src/hooks/backroom/
  useAllowanceBuckets.ts          (new)
  usePricingDisplayRules.ts       (new)
  useBackroomAlertRules.ts        (new)
  useBackroomStations.ts          (extend with update/delete)

src/components/dashboard/backroom-settings/
  AllowancesBillingSection.tsx     (new)
  StationsHardwareSection.tsx      (new)
  InventoryReplenishmentSection.tsx (new)
  BackroomPermissionsSection.tsx   (new)
  AlertsExceptionsSection.tsx      (new)
  FormulaAssistanceSection.tsx     (new)
  MultiLocationSection.tsx         (new)

src/pages/dashboard/admin/BackroomSettings.tsx (wire new sections)
```

## Build Order

1. **Hooks first:** `useAllowanceBuckets`, `usePricingDisplayRules`, `useBackroomAlertRules`, extend `useBackroomStations`
2. **Simpler sections:** Stations & Hardware, Permissions, Formula Assistance
3. **Complex sections:** Allowances & Billing, Alerts & Exceptions, Inventory & Replenishment
4. **Multi-Location** (depends on all others being functional)
5. **Wire all into BackroomSettings.tsx** (replace ComingSoon placeholders)

## Technical Notes

- All tables + RLS already exist from Phase 1 migration
- No new migrations required
- All sections follow the same Card-based layout pattern as existing sections
- All mutations audit via `log_platform_action` where the hooks already do this
- Multi-location inheritance uses existing `useBackroomSetting(key, locationId)` with org→location fallback

