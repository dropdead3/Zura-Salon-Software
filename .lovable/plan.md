

# Sort Color Products Dark-to-Light + Color Swatch Assignment

## 1. Intelligent Shade-Level Sorting

Add a utility function `extractShadeLevel(name)` that parses the numeric level from product names:
- `"Calura 3NN Dark Brown"` → level `3`
- `"ChromaSilk 10.02 Extra Light Beige Blonde"` → level `10.02`
- `"Demi Clear"` → level `Infinity` (sorts last)
- Names without a number → level `999` (near end)

Apply this sort inside `renderProductTable` (or before passing products to it) when the category is `color` or `toner`. Products sort ascending by shade level (darkest first), with "Clear" always last.

### File
- **New:** `src/lib/shadeSort.ts` — `extractShadeLevel()` and `sortByShadeLevel()` functions
- **Modified:** `src/components/platform/backroom/SupplyLibraryTab.tsx` — apply `sortByShadeLevel()` to product arrays before rendering when inside a color category

## 2. Color Swatch Assignment

### Database
Add a `swatch_color` column (`text`, nullable) to `supply_library_products` to store a hex color value (e.g. `#3B2314` for dark brown, `transparent` for clear).

### UI — Swatch Picker
In the product table, add a small circular swatch cell before the Name column:
- Clicking it opens a compact popover with a curated palette of ~20 hair color tones (blacks, browns, reds, coppers, golds, beiges, ash blondes, platinum, plus a "Clear/None" option rendered as a striped circle)
- Selecting a swatch saves it inline to `swatch_color` via the existing inline-edit pattern
- The swatch displays as a 20px colored circle in the table row; empty swatches show a dashed outline circle

### Curated Palette
Pre-built array of professional hair color tones:
```
Black (#1a1a1a), Dark Brown (#3B2314), Medium Brown (#5C3A1E),
Light Brown (#8B6239), Dark Copper (#8B3A0F), Copper (#B5541A),
Dark Red (#6B1A1A), Red (#8B2020), Dark Gold (#7A5C1F),
Gold (#B8860B), Dark Ash (#5A5A5A), Ash (#8A8A7B),
Dark Blonde (#9B7B3A), Blonde (#C4A44A), Light Blonde (#D4C47A),
Very Light Blonde (#E8DDB5), Platinum (#F0EAD6), Violet (#6B3A6B),
Blue (#2A4A6B), Clear (striped/transparent)
```

### Files
- **Migration:** Add `swatch_color text` column to `supply_library_products`
- **New:** `src/components/platform/backroom/SwatchPicker.tsx` — popover palette component
- **Modified:** `src/components/platform/backroom/SupplyLibraryTab.tsx` — add swatch column to `renderProductTable`, wire inline save

