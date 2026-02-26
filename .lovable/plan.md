

## Fix Footer CTA Editor Inspector Overflow

### Problems Visible in Screenshot

1. **Header "Reset" button truncated** — The title "FOOTER CTA SECTION" (font-display, uppercase, wide tracking) plus the description consume too much width, pushing the "Reset" button off-screen. The `flex-shrink-0` on `headerActions` means the title side never compresses enough.

2. **"CALL TO ACTION" sub-heading** — Uses `font-medium text-sm` but visually reads as very prominent. The section divider heading could be tighter.

3. **Headline grid `grid-cols-2 gap-4`** — The `gap-4` (16px) is too generous in a ~290px content area, leaving cramped input fields.

### Changes

#### 1. `FooterCTAEditor.tsx` — Icon-only Reset button
Replace the text-labeled "Reset" button with an icon-only button (matching the Locations fix pattern):

```tsx
<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleReset} title="Reset to defaults">
  <RotateCcw className="h-3.5 w-3.5" />
</Button>
```

This saves ~60px of horizontal space in the header.

#### 2. `FooterCTAEditor.tsx` — Tighten headline grid gap
Change `grid grid-cols-2 gap-4` to `grid grid-cols-2 gap-2` for the headline line inputs, recovering 8px.

#### 3. `FooterCTAEditor.tsx` — Compact section divider headings
Change the "Call to Action" `h4` from `font-medium text-sm` to `font-display text-xs tracking-wide text-muted-foreground` to match the section group header pattern used elsewhere, and reduce `space-y-4` to `space-y-3` inside the CTA settings block.

### Files Modified

| File | Change |
|------|--------|
| `FooterCTAEditor.tsx` | Icon-only reset button, tighter headline grid gap, compact section divider |

