

## Fix Locations Inspector -- Cards Bleeding Past Edge

### Root Cause

The previous edit added `overflow-hidden` to the info banner and tightened inner padding, but **missed adding `overflow-hidden` to the root `EditorCard`** on line 71. Without this, the location cards and their content can still push past the inspector panel boundary.

Additionally, the location name + badge row can force horizontal expansion when the name is long combined with the "Visible" badge.

### Changes

**`src/components/dashboard/website-editor/LocationsContent.tsx`**

| Line | Current | Fix |
|------|---------|-----|
| 71 | `<EditorCard` (no className) | Add `className="overflow-hidden"` |
| 170 | `flex items-center gap-1.5 mb-1 min-w-0` | Add `overflow-hidden` to clip the name+badge row |
| 187 | `{location.address}, {location.city}` | Already has `truncate` -- fine |

Single change: Add `className="overflow-hidden"` to the root `EditorCard` element on line 71. This is the containment fix that was planned but not applied in the previous edit. It ensures the entire card tree clips within the inspector panel width.

### Why This Fixes It

`EditorCard` renders an outer `div` with `overflow-hidden` in its own className merge, which forces all nested `Card` elements, badges, and text to respect the panel boundary. The inner elements already have `min-w-0` and `truncate` from the previous edit -- they just need the ancestor overflow clip to activate.

