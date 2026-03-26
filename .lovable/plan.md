

## Fix Bowl/Bottle Renumbering After Deletion

### Problem
When a bowl is deleted, `bowlNumber` is correctly renumbered (`i + 1`), but the `label` property (e.g. "Bowl 2") is not updated to match. So "Bowl 2" stays as "Bowl 2" even when it becomes the only bowl.

### Change

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

Update the `.map()` in three places to also regenerate the label using the existing `vesselLabel` helper:

1. **`removeBowl` handler (line 380):**
   ```tsx
   return next.map((b, i) => ({ ...b, bowlNumber: i + 1, label: vesselLabel(b.vesselType, i + 1) }));
   ```

2. **Undo handler (line 395):**
   ```tsx
   return next.map((b, i) => ({ ...b, bowlNumber: i + 1, label: vesselLabel(b.vesselType, i + 1) }));
   ```

3. **Save auto-remove empty bowls (line 617):**
   ```tsx
   const bowlsToSave = activeBowls.map((b, i) => ({ ...b, bowlNumber: i + 1, label: vesselLabel(b.vesselType, i + 1) }));
   ```

### Scope
- Single file, 3 lines changed
- No logic or UI changes beyond label consistency

