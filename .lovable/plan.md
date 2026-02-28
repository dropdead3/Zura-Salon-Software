

## Investigation Summary

The black gaps at the right and bottom edges of the website preview viewport are caused by two compounding issues:

1. **CSS transform scaling sub-pixel gaps**: The iframe is rendered at 1440px width and scaled down via `transform: scale()`. The current `+1px` buffer in the scale calculation is insufficient — sub-pixel rounding leaves thin gaps at the right and bottom edges where the scaled content doesn't fully cover the container.

2. **Dark dashboard background bleeding through**: The editor page container uses `bg-muted/30` which resolves to a dark color in the dashboard's dark theme. The canvas panel's `rounded-xl overflow-hidden` border and any scaling gaps expose this dark background.

## Plan

### 1. Increase scale buffer to eliminate right-edge gap
In `CanvasPanel.tsx`, change the fit scale calculation from `+1` to `+2` pixel buffer, ensuring the scaled iframe slightly overflows rather than falling short:

```ts
// Line 160: Change from (containerSize.w + 1) to (containerSize.w + 2)
const fitScale = isDesktop && containerSize.w > 0
  ? Math.min((containerSize.w + 2) / effectiveWidth, 1)
  : 1;
```

### 2. Match canvas container background to iframe content
On the canvas surface container (line 188), ensure the `bg-background` matches the cream website background. Add an explicit inline background color that matches the website's cream theme so any sub-pixel gaps show cream, not dark:

```tsx
// Line 188: Add cream fallback background
<div ref={containerRef} className="flex-1 overflow-hidden relative"
  style={{ backgroundColor: 'hsl(36, 39%, 93%)' }}>
```

This uses the website's cream `--background` color directly, so any gap shows the same cream instead of the dashboard's dark background.

### 3. Remove rounded corners from canvas panel in editor context  
The `rounded-xl` on the canvas panel token creates corners where the dark dashboard background peeks through. For the canvas panel specifically, override the rounding to prevent corner bleed:

In `CanvasPanel.tsx` line 167, add `rounded-none` override:
```tsx
<div className={cn(editorTokens.panel.canvas, 'h-full flex flex-col relative rounded-none')}>
```

Alternatively, if the bento aesthetic requires rounding, keep rounding but ensure the canvas background color matches the iframe content.

### Verification
After each change, take a screenshot to confirm the gaps are resolved at both the right edge and bottom edge.

