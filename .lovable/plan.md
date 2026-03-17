

## Style Organization Brand Cards Like Platform

### What's changing

The organization brand cards in `BackroomProductCatalogSection.tsx` (lines 1133-1193) and `SupplyLibraryDialog.tsx` (lines 138-161) need to match the platform card layout, while keeping org theme colors.

### Changes

**1. `BackroomProductCatalogSection.tsx` — Brand card (lines ~1133-1193)**

- Use `font-display tracking-wide` for brand name (like platform) instead of `font-sans font-medium`
- Change badge text from `{brandProds.length} products` to `{tracked} of {brandProds.length} products`
- Increase `min-h` from `140px` to `160px` to match platform
- Add `pt-9 pb-8` padding to match platform card centering
- Remove the separate "tracked" line (`{tracked}/{brandProds.length} tracked`) since it's now in the badge

**2. `SupplyLibraryDialog.tsx` — Brand card (lines ~138-161)**

- Use `font-display tracking-wide` for brand name instead of `font-display font-medium`
- Increase `min-h` from `120px` to `160px`
- Add `pt-9 pb-8` padding for consistent vertical centering
- Keep the `{b.totalProducts} products` badge text as-is (this is the global supply library, not org catalog)

Both files keep org semantic classes (`bg-card`, `text-foreground`, `text-muted-foreground`, `Badge`) — only the layout structure and typography are aligned with the platform cards.

