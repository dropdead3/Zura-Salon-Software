

## Fix: Add Back Navigation to the Website Editor

### What Happened

When we implemented the three-panel "Luxury Glass Bento" editor, we correctly suppressed the dashboard sidebar and top bar (`hideSidebar`, `hideTopBar`) to give the editor a full-screen operating surface. But we forgot to add any escape route back to the dashboard. The Canvas header has site name, viewport toggles, and action buttons -- but zero navigation. You're trapped.

### Fix

Add a back button to the left side of the `CanvasHeader`, before the site name. This is the correct placement per the spec -- the header's left zone is the natural location for escape navigation.

**File: `src/components/dashboard/website-editor/panels/CanvasHeader.tsx`**

- Import `ArrowLeft` from lucide-react and `useNavigate` from react-router-dom
- Add a back button as the first element in the left zone: a ghost icon button with `ArrowLeft` that navigates to `/dashboard`
- Add a subtle vertical separator (`border-r border-border/40 h-5`) between the back button and the site name
- Tooltip: "Back to Command Center"
- Keyboard shortcut: `Escape` key listener that navigates back (with a guard to prevent firing when inside input/textarea/dialog)

The button uses the existing `tokens.button.inline` size pattern (sm, ghost variant). No new components needed.

### Motion

Back button is always visible (no animation needed -- it's structural navigation, not a contextual control). The `Escape` key handler follows the same guard pattern already used in `useCommandMenu.ts`.

### Files Changed

1. **`src/components/dashboard/website-editor/panels/CanvasHeader.tsx`** -- Add `ArrowLeft` back button + `Escape` key handler

One file. Small, targeted fix.

