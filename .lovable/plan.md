

## Problem

When the inspector panel collapses, the canvas container grows wider (flex-1). The ResizeObserver fires and recalculates `fitScale`, but there's a visual gap on the right edge. Two contributing factors:

1. The outer canvas panel has `bg-muted/20` (from `editorTokens.panel.canvas`) which shows through as a lighter strip beside the inner `bg-background` div — especially visible during or after resize.
2. Sub-pixel rounding: `fitScale = containerSize.w / 1440` can produce a fractional scale that, when multiplied back (`1440 * scale`), lands a fraction of a pixel short of the container width.

## Plan

### 1. Eliminate the background mismatch (editor-tokens.ts)

Change the canvas panel token background from `bg-muted/20` to `bg-background` so no lighter strip ever shows between the panel edge and the iframe.

**File**: `src/components/dashboard/website-editor/editor-tokens.ts` line 17

`bg-muted/20` → `bg-background`

### 2. Over-scale by a tiny amount to prevent sub-pixel gaps (CanvasPanel.tsx)

Add a 1px buffer to the scale calculation so the iframe's visual width always slightly exceeds the container rather than falling a fraction of a pixel short:

```tsx
const fitScale = isDesktop && containerSize.w > 0
  ? Math.min((containerSize.w + 1) / DESKTOP_WIDTH, 1)
  : 1;
```

### 3. Remove duplicate `overflow-hidden` causing clipping artifacts (CanvasPanel.tsx)

The inner container div at line 183 has `overflow-hidden` AND the outer panel token also has `overflow-hidden`. The inner one is unnecessary and can cause the scaled iframe to clip at the right edge. Remove `overflow-hidden` from the inner container (line 183), keeping only the outer panel's `overflow-hidden` from the editor token.

`"flex-1 overflow-hidden bg-background relative"` → `"flex-1 overflow-auto bg-background relative"`

This allows the scaled content to render fully within the outer panel's bounds.

Three small edits across two files.

