

## Fix Website Locations Inspector Overflow

### Problem

The location cards inside the Locations inspector panel bleed past the right edge. The root `EditorCard` is missing `overflow-hidden` (which was added to Gallery but not here), and the inner `Card` components lack width containment so their content pushes beyond the panel boundary.

### Changes

**`src/components/dashboard/website-editor/LocationsContent.tsx`**

1. **Add `overflow-hidden` to root EditorCard** (line 71) -- `className="overflow-hidden"` to clip all children within the panel boundary.

2. **Info banner text wrapping** (lines 100-113) -- The info banner is fine structurally but add `overflow-hidden` to the outer div for safety.

3. **Location cards** (line 139) -- The `Card` already has `overflow-hidden` on line 142, which is good. The real issue is the flex container on line 146 (`flex items-start gap-2 p-2.5`) -- reduce padding slightly and ensure `min-w-0` on the flex container so the content column can shrink.

4. **Reduce reorder handle width** -- The reorder column (lines 148-166) takes horizontal space. Add `shrink-0` to keep it fixed but compact.

### Specific Edits

| Line | Current | Fix |
|------|---------|-----|
| 71 | `<EditorCard` (no className) | Add `className="overflow-hidden"` |
| 146 | `flex items-start gap-2 p-2.5` | `flex items-start gap-1.5 p-2 min-w-0` |
| 100 | `bg-muted/50 border rounded-lg p-3 flex items-start gap-2.5` | Add `overflow-hidden` |

### Result
All location cards and their content (address, phone, hours, badges, toggles) clip cleanly within the inspector panel width.

