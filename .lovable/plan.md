

# Add "Suggest Missing Brand" to Supply Library Dialog

## Approach
Add a small inline suggestion form at the bottom of the brand list panel. When clicked, it expands to a compact text input + submit button. Submissions insert into the existing `platform_feedback` table with `type: 'feature_request'` and `category: 'supply_library'`.

## Changes

### `src/components/dashboard/backroom-settings/SupplyLibraryDialog.tsx`
- Add a "Missing a brand?" button at the bottom of the brand list `ScrollArea`
- On click, toggle a compact inline form: single text input for brand name + optional product details + Submit button
- On submit, insert into `platform_feedback` via the existing table (type `feature_request`, category `supply_library`, title auto-prefixed with "Brand Request: ")
- Show success toast on submit, reset form
- No new files needed — self-contained within the dialog

| File | Action |
|------|--------|
| `src/components/dashboard/backroom-settings/SupplyLibraryDialog.tsx` | Add suggest-brand form in brand sidebar footer |

