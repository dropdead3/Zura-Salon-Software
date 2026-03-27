

# Fix: Wire All Page Explainers to the Org-Level Toggle

## Problem
`FirstTimeCallout` has its own localStorage-only visibility logic and does NOT check the org-level `show_infotainers` toggle. This means explainers using `FirstTimeCallout` (Color Bar Inventory, Forecasting Card) ignore the toggle in the top bar.

Additionally, several Color Bar settings sections still use inline `Infotainer` calls instead of the centralized `PageExplainer` component. While `Infotainer` does respect the toggle, these should be migrated to the registry for consistency.

## Changes

### 1. Update `FirstTimeCallout` to respect the org toggle
Modify `src/components/ui/FirstTimeCallout.tsx` to import and use `useInfotainerVisible` from `@/hooks/useInfotainers` instead of its own localStorage check. This ensures it obeys the same org-level toggle as `Infotainer`.

### 2. Migrate remaining inline Infotainers to PageExplainer registry
Move content from these files into `src/config/pageExplainers.ts` and replace inline `<Infotainer>` with `<PageExplainer pageId="...">`:

| File | Current | New pageId |
|------|---------|------------|
| `ColorBarSetupOverview.tsx` | Inline Infotainer | `color-bar-setup-overview` |
| `ColorBarPermissionsSection.tsx` | Inline Infotainer | `color-bar-permissions` |
| `AlertsExceptionsSection.tsx` | Inline Infotainer | `color-bar-alerts` |
| `FormulaAssistanceSection.tsx` | Inline Infotainer | `color-bar-formula` |
| `ColorBarProductCatalogSection.tsx` | Inline Infotainer | `color-bar-products` |

### 3. Migrate FirstTimeCallout usages to PageExplainer
Replace `FirstTimeCallout` with `PageExplainer` in:
- `ColorBarInventorySection.tsx` (id: `color-bar-inventory-workflow`)
- `ForecastingCard.tsx` (id: `realization-rate`)

Add these entries to the registry.

### 4. Add registry entries
Add all new pageIds to `src/config/pageExplainers.ts` with accurate descriptions.

## Files Changed
- **Modified:** `src/components/ui/FirstTimeCallout.tsx` — add org toggle awareness
- **Modified:** `src/config/pageExplainers.ts` — add ~7 new registry entries
- **Modified:** 5 Color Bar settings files — replace inline `Infotainer` with `PageExplainer`
- **Modified:** `ColorBarInventorySection.tsx` — replace `FirstTimeCallout` with `PageExplainer`
- **Modified:** `ForecastingCard.tsx` — replace `FirstTimeCallout` with `PageExplainer`

