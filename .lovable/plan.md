

## Comprehensive Responsiveness Fix for All Website Editor Sections

Your instinct is right -- the fundamental problem across every editor section is that they use **viewport-based breakpoints** (`md:`, `lg:`) for multi-column grids, but the editor panel is never wider than ~500-600px regardless of viewport size. A `grid-cols-3` with an `md:` breakpoint at 768px will never trigger inside a 500px panel. Every multi-column layout that relies on viewport breakpoints is broken by design in this context.

### The Pattern to Fix Everywhere

Every `grid grid-cols-2 md:grid-cols-3` or `grid grid-cols-2` inside the editor panel needs to become single-column by default, since the panel is always narrow. The `md:` breakpoint should only kick in if the panel were somehow very wide (which it won't be).

---

### File-by-File Changes

**1. `src/components/dashboard/website-editor/AnnouncementBarContent.tsx`**

- **Line 221**: Message Content grid `grid gap-4 md:grid-cols-3` -- Change to `grid gap-4 grid-cols-1`. Three input fields stacked vertically. In a 500px panel, three columns would give each field ~150px which is unusable.
- **Line 266**: CTA grid `grid gap-4 md:grid-cols-2` -- Change to `grid gap-4 grid-cols-1`. Two columns at 500px = 230px each, marginal. Single column is cleaner.
- **Line 84**: Header `flex-col sm:flex-row` is fine but the "Preview Website" button could be removed or made icon-only since there's already an "Open" button in the toolbar.

**2. `src/components/dashboard/website-editor/GalleryContent.tsx`**

- **Line 338**: Gallery image grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` -- Change to `grid-cols-2`. In a 500px panel, 2 columns = ~240px each (good for gallery cards). 3-4 columns would be 120-160px (too small for the image + alt text).
- **Line 243-250**: Tab triggers have icons + text. Shorten: remove icons from triggers to save space, or use `text-xs sm:text-sm` like the stylists tabs.
- **Line 429**: Transformations grid `grid-cols-1 md:grid-cols-2` -- Change to `grid-cols-1`. Before/after cards are complex and need full width.

**3. `src/components/dashboard/website-editor/TestimonialsContent.tsx`**

- **Lines 100-184**: `SortableTestimonialCard` -- The action buttons (visibility, edit, delete) are in a `shrink-0` div alongside the content. On narrow panels, the content gets squeezed. Change the card layout to stack: content above, actions below-right. Move the actions row to `flex justify-end gap-2 pt-2 border-t mt-2` below the text.
- **Line 377**: Stats grid `grid-cols-2` is acceptable at 500px (240px each). Keep as-is.

**4. `src/components/dashboard/website-editor/LocationsContent.tsx`**

- **Lines 82-103**: Header buttons "Preview" and "Edit in Settings" -- wrap with `flex-wrap` so they stack on narrow panels. Add `flex-wrap` to the button container.
- **Lines 151-217**: Location card layout has reorder arrows + location info + visibility toggle in one row. Change to stack: reorder on the left (keep), info in middle, but move the "Show on website" toggle below the info section instead of right-aligned. Use `flex-col` wrapping for the card content.

**5. `src/components/dashboard/website-editor/ServicesContent.tsx`**

- **Lines 471-731**: Service item rows have name + badges + Online toggle + Popular toggle + Mail button + Edit button all in one horizontal line. This is the worst crunch. Change to a stacked layout:
  - Row 1: Service name + badges (flex-wrap)
  - Row 2: Price range
  - Row 3: Action controls (Online toggle, Popular toggle, Mail, Edit) with `flex-wrap`
- **Line 303**: Stats `BentoGrid maxPerRow={3}` -- Change to `maxPerRow={2}` so stat cards get more breathing room. 3 columns at 500px = 150px each which is very tight.

**6. `src/components/dashboard/website-editor/ExtensionsEditor.tsx`**

- **Line 107**: Headline fields `grid grid-cols-2 gap-4` -- Change to `grid grid-cols-1 gap-4`. Two inputs side-by-side in a 500px panel = 230px each, which works but looks cramped. Single column is cleaner for a settings editor.

**7. `src/components/dashboard/website-editor/BrandsManager.tsx`**

- **Line 127**: Brand details `grid grid-cols-2 gap-3` -- Change to `grid grid-cols-1 gap-3`. Two inputs side-by-side in the narrow panel is tight especially with the drag handle + logo + delete button also in the row.

**8. `src/components/dashboard/website-editor/DrinksManager.tsx`**

- **Lines 66-151**: Drink item layout has drag handle + image preview + content fields + delete button in one horizontal row. On narrow panels, the content fields get squeezed. Change to: drag handle stays inline, but move image preview above the text fields (stack vertically), so the image and fields don't compete for horizontal space.

**9. `src/components/dashboard/website-editor/SectionDisplayEditor.tsx`**

- **Line 79**: Remove `max-w-2xl`. This constraint is unnecessary since the panel already constrains width, and it wastes horizontal space when the panel is wider.
- **Line 84**: Change `space-y-6` to `space-y-4` for tighter vertical spacing in the narrow context.

**10. `src/components/dashboard/website-editor/FooterEditor.tsx`**

- **Line 185**: Remove `max-w-3xl`. Same reason as SectionDisplayEditor -- the panel already constrains width.

### Technical Details

The editor panel width calculation:
```text
Viewport: 1920px
- Dashboard sidebar (collapsed): 0px
- Editor sidebar: 300px
- Resizable split (55/45): (1920 - 300) × 0.55 = 891px
- Editor padding: p-4 (16px × 2) = 32px
- Available content width: ~859px ← this is the max case

Viewport: 1366px (laptop)
- Editor sidebar: 300px
- Split: (1366 - 300) × 0.55 = 586px
- Padding: 32px
- Available: ~554px ← typical case

Viewport: 1366px, sidebar collapsed, split at 40%:
- (1366) × 0.40 = 546px
- Padding: 32px
- Available: ~514px ← narrow case
```

At 500-550px available width, any grid with 3+ columns is broken. 2 columns is marginal (250px each). Single column is the safe default for form inputs. Gallery image grids at 2 columns (250px each) still work well.

### Files Changed
- `src/components/dashboard/website-editor/SectionDisplayEditor.tsx`
- `src/components/dashboard/website-editor/AnnouncementBarContent.tsx`
- `src/components/dashboard/website-editor/GalleryContent.tsx`
- `src/components/dashboard/website-editor/TestimonialsContent.tsx`
- `src/components/dashboard/website-editor/LocationsContent.tsx`
- `src/components/dashboard/website-editor/ServicesContent.tsx`
- `src/components/dashboard/website-editor/ExtensionsEditor.tsx`
- `src/components/dashboard/website-editor/BrandsManager.tsx`
- `src/components/dashboard/website-editor/DrinksManager.tsx`
- `src/components/dashboard/website-editor/FooterEditor.tsx`

