

# Add Fullscreen Mode to Stylist Levels Editor

## Problem
The criteria table is constrained within the settings page layout, making it hard to view and edit levels — especially with many levels or on smaller screens.

## Solution
Add a fullscreen toggle button that expands the table into a fixed fullscreen overlay, removing the `max-h-[70vh]` constraint and giving the user the entire viewport.

### Changes in `StylistLevelsEditor.tsx`

1. **Add `Maximize2` / `Minimize2` icons** from lucide-react to the import list.

2. **Add `isFullscreen` state** to the component (boolean, default false).

3. **Update `ScrollableTableWrapper`** to accept an `isFullscreen` prop and `onToggleFullscreen` callback:
   - When fullscreen: wrap in a `fixed inset-0 z-50 bg-background flex flex-col` overlay with a header bar containing a title ("Criteria Matrix") and a minimize button.
   - The scroll container changes from `max-h-[70vh]` to `flex-1` to fill the screen.
   - When not fullscreen: render as today, but add a maximize button in the top-right corner of the container.

4. **Add keyboard support**: Escape key exits fullscreen mode.

5. **Lock body scroll** when fullscreen is active (same pattern used in `QRCodeFullScreen`).

### Visual layout (fullscreen)
```text
┌──────────────────────────────────────────┐
│ ◀ Criteria Matrix              [Minimize]│  ← slim header bar
├──────────────────────────────────────────┤
│                                          │
│   Full table with sticky headers         │
│   and columns, scrollable both ways      │
│                                          │
└──────────────────────────────────────────┘
```

### Visual layout (normal — new button added)
```text
┌─────────────────────────────────┐
│                        [⛶]     │  ← maximize icon, top-right
│   Table as today               │
└─────────────────────────────────┘
```

### Files Modified
- `src/components/dashboard/settings/StylistLevelsEditor.tsx` — add fullscreen state, update `ScrollableTableWrapper`, add Escape handler

### No database changes.

