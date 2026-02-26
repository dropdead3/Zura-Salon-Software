

## Debug: Panels Won't Expand

### Root Cause

The `CANVAS_MIN` constant in `useEditorLayout.ts` is set to **820px**. This is too aggressive. Here's the math at 1440px (the "wide" breakpoint):

```text
Container:          1440px
Gutters + Padding:   -48px
Structure panel:    -300px
Inspector panel:    -360px
─────────────────────────
Canvas remaining:    732px  ← LESS than CANVAS_MIN (820)
```

Result: the auto-collapse logic on lines 134-139 **always** force-collapses the inspector, even at the widest breakpoint. When you click the expand chevron, `toggleInspector` sets `inspectorCollapsed: false` in prefs, but on the very next render the space check overrides it and collapses it again. The panel flickers or simply never expands.

The same applies to the structure panel at narrower widths -- the space check on line 137-139 re-collapses it immediately after the user tries to expand.

Additionally, the toggle logic doesn't differentiate between "auto-collapsed by the layout engine" and "user explicitly collapsed." So user intent is always overridden by the space check.

### Fix (single file: `src/hooks/useEditorLayout.ts`)

**1. Reduce `CANVAS_MIN` from 820 to 480.**

820px was meant to represent "desktop editing minimum" but it's unrealistic -- it's wider than a tablet viewport. Pro editors like Webflow and Figma allow canvases as narrow as ~400px when side panels are open. 480px is a safe minimum that still shows useful content.

**2. Respect explicit user intent in the toggle functions.**

When the user clicks expand, temporarily mark the preference as "explicitly expanded" so the space check doesn't immediately override it. Specifically:
- In `toggleStructure`: set `structureCollapsed: false` (as today)
- In `toggleInspector`: set `inspectorCollapsed: false` (as today)  
- In the auto-collapse logic: only auto-collapse if the user hasn't **explicitly set** the pref to `false`. The current check on line 124 (`prefs.inspectorCollapsed !== false`) already attempts this pattern, but it's overridden by the space check below it. The fix: skip the space-check override when the user has explicitly set `Collapsed: false`.

**3. Adjust `GUTTERS_AND_PADDING` to match actual layout.**

The shell uses `gap-3 p-3` = 12px gap between panels (×2 gaps = 24px) + 12px padding (×2 sides = 24px) = 48px. This is correct but the collapsed rail (40px) also consumes space that isn't accounted for. Update the space calculation to include the rail width when a panel is collapsed.

### Concrete Changes

```typescript
// Line 18: reduce canvas minimum
const CANVAS_MIN = 480;

// Lines 118-139: rewrite auto-collapse to respect user intent
let structureVisible = !isMobile && !isTablet && !prefs.structureCollapsed;
let inspectorVisible = !isMobile && !isTablet && !prefs.inspectorCollapsed;

// For compact: auto-collapse inspector only if user hasn't explicitly expanded
if (isCompact && prefs.inspectorCollapsed === undefined) {
  inspectorVisible = false;
}

// Space check: only override if user hasn't explicitly set the pref
const spaceWithBoth = containerWidth - GUTTERS_AND_PADDING - idealStructureWidth - idealInspectorWidth;
const spaceWithStructureOnly = containerWidth - GUTTERS_AND_PADDING - idealStructureWidth;

if (structureVisible && inspectorVisible && spaceWithBoth < CANVAS_MIN) {
  // Only auto-collapse if user didn't explicitly expand
  if (prefs.inspectorCollapsed === undefined) {
    inspectorVisible = false;
  }
}
if (structureVisible && !inspectorVisible && spaceWithStructureOnly < CANVAS_MIN) {
  if (prefs.structureCollapsed === undefined) {
    structureVisible = false;
  }
}
```

This ensures:
- First load (prefs undefined): layout engine auto-collapses based on space
- User clicks expand: pref set to `false`, space check is skipped, panel stays open
- User clicks collapse: pref set to `true`, panel closes and stays closed

### Files

| File | Change |
|---|---|
| `src/hooks/useEditorLayout.ts` | Reduce `CANVAS_MIN`, fix auto-collapse to respect user intent |

Single file fix. No other files affected.

