

## Remove Global "Sync from Zura Library" Button

### Change

In `BackroomProductCatalogSection.tsx`, remove the global sync button (lines 713-724) that appears when no brand is selected. The brand-scoped sync button (lines 701-712) already only shows when `selectedBrand` is set — that one stays as-is.

### File
- `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx` — Delete the `{!selectedBrand && hasProducts && (...)}` block (lines 713-724) that renders the global "Sync from Zura Library" button.

