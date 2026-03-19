

# Add "Other" Specification Input for Dropdown Selections

## Problem
When "Other" is selected in a dropdown (e.g., Reorder Method), there's no way to specify what "Other" means.

## Changes

### 1. `src/components/dashboard/backroom-settings/AddSupplierWizard.tsx`
- Add a `reorder_method_other` field to the wizard's `details` state
- After the Reorder Method select, conditionally render a text Input when `reorder_method === 'other'` with placeholder "Specify method..."
- Pass `reorder_method_other` through to the supplier creation so it persists (likely stored in `reorder_notes` or a new column)

### 2. `src/components/dashboard/backroom-settings/SupplierSettingsSection.tsx`
- Same pattern: after the Reorder Method select (~line 348), add a conditional Input when value is `'other'`
- Wire it into the form via `register('reorder_method_other')` or store in `reorder_notes`

### 3. Database consideration
The `suppliers` table likely doesn't have a `reorder_method_other` column. Two options:
- **Simple**: Concatenate into existing `reorder_method` field as `"other:Website XYZ"` and parse on display
- **Cleaner**: Add a `reorder_method_other` text column to the suppliers table via migration

I'll add the column for cleanliness, with a single migration adding `reorder_method_other text` to the suppliers table.

### 4. `src/pages/dashboard/platform/Accounts.tsx`
- Same pattern for the "Other" business type selection (~line 264): show an input when `other` is selected to capture the specific type

## Summary
Three locations get the conditional input field. One small migration adds the column. Clean and consistent.

