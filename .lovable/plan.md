

## Make Testimonials Inspector Cohesive with Other Panels

### Problem

The Testimonials panel renders as a raw `div` with its own custom header layout, while all other inspector panels (Gallery, Footer CTA, Locations, Stylists) use the `EditorCard` wrapper component. This creates visual inconsistency -- the Testimonials panel lacks the frosted-glass header, compact stat sizing, and overflow containment that the other panels share.

### Current vs Expected Pattern

| Aspect | Current (Testimonials) | Expected (matches Gallery, etc.) |
|--------|----------------------|----------------------------------|
| Wrapper | Raw `<div className="space-y-6">` | `<EditorCard title="..." icon={...} description="...">` |
| Header | Custom h2 + description + floating Add button | EditorCard sticky frosted-glass header with icon-only or compact headerActions |
| Stats grid | `grid-cols-2 gap-4`, `p-4`, `text-2xl` values | `grid-cols-1 gap-3`, `p-3`, `text-lg` values, `min-w-0` containment |
| Empty state | `p-8`, `text-lg font-medium` heading | `p-6`, `text-sm` description, compact heading |
| Info card | Separate Card with CardHeader/CardTitle | Compact `text-xs text-muted-foreground` block or removed |
| Add button | Full `<Button>` in header area | `w-full` stacked button or icon-only in EditorCard headerActions |
| Loading | Custom skeleton layout | Centered `Loader2` spinner (matches Gallery) |

### Changes

#### `TestimonialsContent.tsx`

1. **Wrap in EditorCard** -- Replace the raw `div` wrapper with `<EditorCard title="Testimonials" icon={Quote} description="Manage customer reviews" className="overflow-hidden">` with an icon-only "Add" button as `headerActions`.

2. **Compact stats** -- Change `grid-cols-2 gap-4` to `grid-cols-1 gap-3`. Reduce stat card padding from `p-4` to `p-3`, icon containers from `p-2` to `p-1.5`, icon sizes from `w-5 h-5` to `w-4 h-4`, stat values from `text-2xl` to `text-lg`, stat labels from `text-sm` to `text-xs`. Add `min-w-0` for truncation safety.

3. **Compact empty state** -- Reduce from `p-8` to `p-6`, heading from `text-lg font-medium mb-2` to `text-sm font-medium mb-1`, description to `text-sm`, and make the "Add Testimonial" button `w-full`.

4. **Compact info card** -- Reduce the "About Testimonials" card: remove `CardHeader`/`CardTitle` overhead, use a simpler compact layout with smaller text matching other panels.

5. **Loading state** -- Replace custom skeletons with centered `Loader2` spinner matching Gallery pattern.

6. **Testimonial cards** -- Reduce internal card padding, tighten the title row with `min-w-0` for overflow safety, and use smaller action buttons (`h-7 w-7`).

7. **Remove standalone header** -- The `h2` + description + "Add Testimonial" button block (lines 284-376) is replaced by the EditorCard header + a full-width "Add Testimonial" button inside the content area (matching Gallery's stacked button pattern).

### Files Modified

| File | Change |
|------|--------|
| `TestimonialsContent.tsx` | Wrap in EditorCard, compact stats/empty/info/loading, overflow containment |

