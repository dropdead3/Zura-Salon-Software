

# Improve Supply Library & Product Catalog UI

## Current Issues (from screenshot + code review)
- Dialog is `max-w-2xl` (~672px) — cramped for a two-panel browse experience
- Brand sidebar is only 200px — truncates longer brand names
- Product rows lack visual breathing room; size chips feel tight
- Empty state CTA ("Browse Supply Library") is plain — could feel more inviting
- Product rows in the catalog have too many inline controls squeezed horizontally
- No visual grouping between the header badge/button area and the product list
- "Suggest Missing Brand" form is cramped at 200px sidebar width

## Changes

### `src/components/dashboard/backroom-settings/SupplyLibraryDialog.tsx`

1. **Widen dialog** — `max-w-3xl` and `max-h-[80vh]` for more room
2. **Widen brand sidebar** — `w-[220px]` → gives full brand names space
3. **Brand list items** — increase vertical padding (`py-2.5`), add subtle left accent bar on active brand instead of just bg swap
4. **Product cards** — increase padding to `p-4`, add a subtle product-type icon or colored left border per category
5. **Size chips** — slightly larger touch targets (`px-3 py-1.5`), better spacing (`gap-2 mt-2.5`)
6. **Empty/no-brand-selected state** — larger icon, warmer copy
7. **Footer** — sticky feel with slightly more padding and a subtle separator shadow
8. **Suggest brand form** — slightly wider inputs, better vertical rhythm

### `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx`

1. **Product rows** — increase padding to `p-4`, use `gap-5` for more breathing room between toggle/info/controls
2. **Depletion controls section** — wrap in a subtle `bg-muted/30 rounded-lg px-3 py-2` container so the inline controls feel grouped
3. **Empty state** — slightly larger icon container (`h-16 w-16`), more vertical padding
4. **Filters bar** — add `items-center` alignment fix, consistent gap

## Files

| File | Action |
|------|--------|
| `src/components/dashboard/backroom-settings/SupplyLibraryDialog.tsx` | Layout + spacing polish |
| `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx` | Row density + control grouping |

