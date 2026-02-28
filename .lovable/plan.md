

## Problem

When the inspector panel collapses, the canvas container grows wider. The ResizeObserver detects the new width and recalculates the scale, but two issues cause the visible gap:

1. **Transition lag**: The inner iframe wrapper has `transition-all duration-200` which animates the `transform` change, creating a visible delay where the old scale doesn't fill the new container width.
2. **Visual rendering**: The scaled element sits at `transform-origin: top left` with a layout box of 1440px. While the visual width matches (`1440 * scale = containerWidth`), the transition between old and new scale creates a momentary gap showing the `bg-muted/30` background.

## Plan

### 1. Remove transition from desktop scaled iframe wrapper (CanvasPanel.tsx)

The `transition-all duration-200` class on the iframe wrapper (line 186) causes the scale change to animate slowly when the container resizes. For desktop mode, the scale should update instantly to match the container width. Keep transitions only for viewport mode switches (desktop→mobile).

- Split the transition: apply it only when `!isDesktop` (for tablet/mobile centering animations), not during desktop scale recalculations.

### 2. Match container background to iframe background

Change the canvas surface container background from `bg-muted/30` to `bg-background` so any sub-pixel gaps between the scaled iframe and container edge are invisible.

### Changes in `CanvasPanel.tsx`

**Line 183**: Change `bg-muted/30` to `bg-background` on the container div.

**Line 186**: Make the transition conditional — only apply `transition-all duration-200` when not in desktop mode, so the desktop scale snaps instantly to the new container width without a visible gap.

```tsx
// Line 183 — container background matches iframe
<div ref={containerRef} className="flex-1 overflow-hidden bg-background relative">

// Line 185-186 — conditional transition
className={cn(
  'h-full',
  !isDesktop && 'transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
  !isDesktop && VIEWPORT_WIDTHS[viewportMode],
  editorTokens.canvas.previewFrame,
  !isDesktop && 'mx-auto'
)}
```

Two targeted edits in `CanvasPanel.tsx` — background color swap and conditional transition.

