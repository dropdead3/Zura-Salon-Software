

## Move Location Toggle & Sync Button to Right Side of Card Header

### Current State
The location `Select` dropdown and "Sync to All Locations" button sit in their own row below `CardHeader` (lines 900–928), left-aligned with `px-6 pb-2`.

### Change

**File:** `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx`

**Lines 900–928** — Move the location select and sync button into the right-side actions area of the `CardHeader` (inside the `div` that already contains view toggles, tracked badge, and Supply Library button around lines 840–896), positioned at the far right using `ml-auto`.

Specifically:
1. Remove the standalone `div` block (lines 900–928) that wraps the location select + sync button
2. Insert both controls into the CardHeader's right-side `div`, before the existing badges/buttons, using a wrapper like `<div className="flex items-center gap-2 ml-auto">` to push them right
3. The order within that right group: `[...existing left items] → [Sync to All Locations button] → [Location Select dropdown]` (sync left of location, per request)

### Scope
- 1 file, ~30 lines moved/restructured
- No logic changes

