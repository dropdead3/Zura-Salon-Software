

## Fix: Canvas preview not filling full width when sidebars are collapsed

### Problem
The canvas iframe is hardcoded to `1440px` width (`DESKTOP_WIDTH`). When sidebars collapse, the container becomes wider than 1440px but the iframe stays at 1440px with scale capped at 1.0, leaving dead space on the right.

### Fix — `src/components/dashboard/website-editor/panels/CanvasPanel.tsx`

1. When in desktop viewport mode, use `Math.max(DESKTOP_WIDTH, containerSize.w)` as the effective iframe width instead of always `DESKTOP_WIDTH`. This ensures the iframe expands to fill the full container when space is available.

2. Update the scale calculation: `fitScale = Math.min((containerSize.w + 1) / effectiveWidth, 1)` — this keeps the scale at 1 when the container is large enough, and scales down when the container is smaller than the content width.

3. Update the inline style `width` from fixed `1440px` to `${effectiveWidth}px`.

This is a ~3 line change in the scale/sizing logic. No other files affected.

