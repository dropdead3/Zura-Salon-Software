

# Speed Up Settings Page: Card Grid First, Everything Else Lazy

## Problem

The Settings page imports ~20 lazy components, DnD libraries, and fires multiple hooks (auth, business capacity, billing access, role utils, layout prefs, color theme, etc.) **before** the card grid can render. The card grid itself is pure UI — icons, labels, and click handlers — but it's blocked by all this initialization.

## Approach

Split the Settings page into two layers:

1. **`SettingsCardGrid`** — the card grid view (what you see on load). Renders immediately with minimal dependencies: just the `categoriesMap`, `SECTION_GROUPS`, icons, and the layout order hook. No DnD on first paint — DnD initializes only when "Edit Layout" is clicked.

2. **`SettingsCategoryDetail`** — the detail view (lazy loaded). Only mounts when a category is selected. Contains all 20+ lazy component imports and the heavy sub-page logic.

### What makes it faster

| Before | After |
|--------|-------|
| DnD kit loaded on mount | DnD kit lazy-loaded only when Edit Mode toggled |
| All 20+ lazy component declarations evaluated on mount | Lazy declarations move to detail component, not evaluated until needed |
| `useBusinessCapacity`, `useRoleUtils`, `useColorTheme`, `useBillingAccess` fire immediately | These hooks move into their respective sub-views; card grid doesn't need them |
| `useStaffingAlertSettings` fires on mount | Moves into System category detail only |

### Card grid dependencies (minimal)
- `useAuth` (already cached)
- `useSettingsLayout` (already cached, just the order array)
- `useBillingAccess` (needed to filter account-billing card visibility — keep but it's lightweight)
- Icon imports from lucide (tree-shaken)
- `categoriesMap` static object

### Files changed

| File | Change |
|------|--------|
| `src/pages/dashboard/admin/Settings.tsx` | Extract card grid to render immediately; wrap DnD context in a lazy-loaded wrapper that only mounts when `isEditMode` is true; move all category detail rendering into a separate lazy component |
| `src/components/dashboard/settings/SettingsCategoryDetail.tsx` (new) | Contains all 20+ lazy imports and the category-specific rendering logic |
| `src/components/dashboard/settings/SettingsDndWrapper.tsx` (new) | Contains DnD context, sensors, sortable logic — only loaded when Edit Layout is clicked |

### DnD lazy-load detail

The card grid renders plain `div` wrappers by default. When "Edit Layout" is clicked, `SettingsDndWrapper` lazy-loads and wraps the same cards with `DndContext` + `SortableContext`. This removes `@dnd-kit/core` and `@dnd-kit/sortable` from the initial bundle for this page entirely.

### No visual changes
The page looks and behaves identically. Cards appear faster because the JS bundle for the initial view is dramatically smaller.

