

## Beautify & Fix Padding — ImageCropModal

### Current Issues (from screenshot)
1. Dialog content padding is uneven — the inner `space-y-4` sits inside default `p-6` dialog padding, creating excess whitespace around the canvas area
2. The canvas preview area lacks visual polish — flat border, no depth
3. Shape toggle buttons look plain
4. Footer buttons have inconsistent spacing (`gap-2 sm:gap-0` creates awkward mobile layout)
5. The "Drag to reposition" overlay label could be more refined
6. Zoom/rotation controls lack visual grouping
7. Warning banners use hardcoded amber colors instead of semantic `warning` tokens

### Changes

**File: `src/components/dashboard/ImageCropModal.tsx`**

1. **Dialog padding**: Override `DialogContent` to `p-0` and manage padding manually — tight padding around canvas, normal padding for controls and footer
2. **Header**: Use `font-display` per design system for the title. Add subtle bottom border separator
3. **Canvas area**: Full-width dark background section (`bg-black/90`) with no side padding, giving the image preview a cinematic feel. Remove the flat `border-border` and use a subtle inset shadow instead
4. **Shape toggle**: Use pill-style buttons (`rounded-full`) matching the card action button pattern
5. **Controls section**: Group zoom + rotation into a unified section with consistent `px-6 pb-4` padding. Use `bg-muted/30` background for the control group to visually separate from canvas
6. **Footer**: Clean `px-6 pb-6` padding, consistent button sizing. "Replace Photo" stays left-aligned, Cancel + Apply right-aligned
7. **Warning banners**: Replace hardcoded `amber-500` with semantic `warning` tokens (`bg-warning/10`, `border-warning/30`, `text-warning`)
8. **"Drag to reposition" hint**: Smaller, more subtle, with reduced opacity

### Files Changed
- `src/components/dashboard/ImageCropModal.tsx` — layout restructure and styling refinements

