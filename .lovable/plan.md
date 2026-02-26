

## Fix LocationsContent Inspector Overflow

### Problems Visible in Screenshot

1. **Header actions overflow** — "Preview" and "Settings" buttons with text labels push past the panel edge. The `headerActions` div has `flex-shrink-0` in EditorCard, so it never compresses, and two text-labeled buttons are ~180px combined in a ~290px content area.

2. **Info banner text runs off** — "Toggle visibility to control which locations appear on..." overflows the right edge. The flex layout with the icon container doesn't constrain the text block width.

3. **Location card addresses overflow** — Long addresses like "3641 E Baseline Rd Suite Q-103, Gilbert, AZ 85234" run past the card boundary despite `truncate` being set.

### Root Cause
The `truncate` and `min-w-0` classes are present but the flex containers don't properly propagate width constraints. The header actions use full text labels that are too wide for the ~290px available content width.

### Changes

#### 1. `LocationsContent.tsx` — Header actions: icon-only buttons
Replace the two text-labeled buttons ("Preview", "Settings") with icon-only buttons using `size="icon"` and `h-7 w-7` to fit the narrow header:

```tsx
headerActions={
  <div className="flex items-center gap-1">
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={...} title="Preview">
      <Eye className="w-3.5 h-3.5" />
    </Button>
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={...} title="Settings">
      <Settings className="w-3.5 h-3.5" />
    </Button>
  </div>
}
```

#### 2. `LocationsContent.tsx` — Info banner: add overflow-hidden + min-w-0
Add `min-w-0` to the text container inside the info banner so `truncate`/wrapping works within the flex layout:

```tsx
<div className="min-w-0 flex-1">
```

#### 3. `LocationsContent.tsx` — Location cards: add overflow-hidden
Add `overflow-hidden` to the Card and ensure the flex-1 content container has `min-w-0` (already present, but the Card itself needs overflow containment).

### Files Modified

| File | Change |
|------|--------|
| `LocationsContent.tsx` | Icon-only header buttons, `min-w-0` on info banner text, `overflow-hidden` on location cards |

### Result
All content stays within the 320px inspector panel boundary. Header actions compress to ~66px (two 28px icon buttons + gap). Text truncation works correctly throughout.

