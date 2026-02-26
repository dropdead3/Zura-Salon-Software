

## Fix: Inspector Right-Edge Padding (Final)

### Why Previous Fixes Failed

The `[&>div]:!overflow-x-hidden` selector on ScrollArea targets the viewport div, but the Radix ScrollArea viewport uses `h-full w-full` without an explicit width constraint in pixels or percentage. In a flex column layout, `w-full` on the viewport resolves to the content's intrinsic width, not the parent's width. So `overflow-x-hidden` clips nothing because the viewport expands to fit its children.

The real fix requires two things the user's CSS correctly identifies:
1. Force the viewport to actually constrain to the panel width (not expand with content)
2. Increase right padding from 20px to 24px for a proper safe area

### Changes

#### 1. `src/components/dashboard/website-editor/editor-tokens.ts` (line 63)

Increase horizontal padding from `px-5` (20px) to `px-6` (24px) matching the user's `padding: 16px 24px 32px 24px`. Also increase bottom padding to `pb-8` (32px).

**Before:** `content: 'px-5 pt-4 pb-6 space-y-4 max-w-full overflow-hidden'`
**After:** `content: 'px-6 pt-4 pb-8 space-y-4 max-w-full overflow-hidden'`

#### 2. `src/components/dashboard/website-editor/panels/InspectorPanel.tsx` (line 113)

Replace the `[&>div]` approach with a more targeted selector that forces the Radix viewport to use `overflow-x: hidden` AND constrains its width to the parent. The key is adding `[&_[data-radix-scroll-area-viewport]]:!overflow-x-hidden` and wrapping the ScrollArea content in a div with `w-full min-w-0 overflow-hidden`.

```tsx
<ScrollArea className="flex-1 overflow-hidden">
  <div className="w-full min-w-0 overflow-x-hidden">
    <PanelSlideIn motionKey={selectionKey} className={editorTokens.inspector.content}>
      {children}
    </PanelSlideIn>
  </div>
</ScrollArea>
```

This wrapper div is the critical missing piece. It sits inside the ScrollArea viewport and forces a block formatting context with `overflow-x-hidden`, which makes `max-w-full` on children resolve to the actual available width rather than the intrinsic content width.

#### 3. `src/components/dashboard/website-editor/EditorCard.tsx` (line 42)

Reduce internal card content padding slightly so cards don't feel cramped inside the now-wider inspector padding. Change from `p-4` to `p-3.5` to compensate.

**Before:** `<div className="p-4 space-y-4 max-w-full box-border overflow-hidden">`
**After:** `<div className="p-3.5 space-y-4 max-w-full box-border overflow-hidden">`

### Files Modified

| File | Change |
|------|--------|
| `editor-tokens.ts` | Increase inspector content padding to `px-6 pb-8` (24px horizontal, 32px bottom) |
| `InspectorPanel.tsx` | Add block-formatting-context wrapper div inside ScrollArea to force width constraint |
| `EditorCard.tsx` | Adjust internal padding to `p-3.5` to balance with increased envelope padding |

