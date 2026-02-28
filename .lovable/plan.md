

## Problem

Two issues visible in the screenshot:

1. **Black scrollbar backgrounds** — The canvas surface container at line 188 uses `overflow-auto`, which renders native scrollbars with dark/black track backgrounds that interfere with the preview.
2. **Unnecessary horizontal scrollbar** — In desktop mode the iframe width matches the container exactly (via `effectiveWidth = Math.max(DESKTOP_WIDTH, containerSize.w)`), so a horizontal scrollbar should never appear. The `overflow-auto` allows it anyway.

## Fix — `src/components/dashboard/website-editor/panels/CanvasPanel.tsx`

**Line 188** — Change the canvas surface container's overflow:

```tsx
// Before
<div ref={containerRef} className="flex-1 overflow-auto bg-background relative">

// After  
<div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-background relative">
```

This:
- Removes the horizontal scrollbar entirely (content is responsive and should never overflow horizontally)
- Keeps vertical scrolling for non-desktop viewports where content may exceed the container height
- Eliminates the black scrollbar track on the right by limiting overflow to vertical only when needed

For desktop mode specifically, the scaled iframe already fits perfectly within the container dimensions, so vertical overflow is also unlikely — but keeping `overflow-y-auto` is safe as a fallback.

Single line change.

