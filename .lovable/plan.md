

## Add "Clear Allowance" Action to the Allowance Calculator

### Problem
When editing an existing allowance, the "Save Allowance" button is disabled when `grandTotal === 0`. This means there's no way to remove/clear a previously saved allowance — the user is stuck with it.

### Solution
Add a "Clear Allowance" button that appears only when an existing allowance is loaded (i.e., there are existing bowls/baselines in the database). This button will:
1. Delete all existing bowls and baselines for this service
2. Deactivate the billing policy (`is_active: false`)
3. Close the dialog with a success toast

### Implementation

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

1. **Add a `handleClearAllowance` function** that:
   - Deletes existing baselines and bowls (reuses the Phase 1 cleanup logic already in `handleSave`)
   - Sets the policy to `is_active: false` via `upsertPolicy`
   - Invalidates query caches
   - Resets local bowl state to a single empty bowl
   - Shows a toast: "Allowance cleared"
   - Closes the dialog

2. **Add a "Clear Allowance" button** in the footer (left side, next to "Copy Summary"), styled as a destructive outline button. Only visible when existing saved data exists (`existingBowls?.length > 0` or `existingBaselines?.length > 0`).

3. **Confirmation**: Use a confirmation toast or a simple `window.confirm` to prevent accidental clears — this is a destructive action.

4. **Also allow saving with zero products**: As an alternative approach, change the Save button's disabled condition from `grandTotal === 0` to only disable when saving is in progress. If all bowls are empty when saving, the save handler would clear existing data and deactivate the policy. However, a dedicated "Clear Allowance" button is clearer UX.

### Scope
- Single file, ~30 lines added
- No database changes

