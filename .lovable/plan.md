

# Replace Brand Chips with Alphabet Selector

## What's changing
Replace the horizontally scrollable brand chips bar with an **A–Z alphabet selector**. Clicking a letter shows all Supply Library brands starting with that letter, then clicking a brand shows its products inline (same dual-view logic as today).

## Layout

```text
┌──────────────────────────────────────────────────┐
│ [🔍 Search products...]                          │
│ [My Catalog] A B C D E F G H I J K L M N O ...  │
├──────────────────────────────────────────────────┤
│  (letter selected → show brand list for letter)  │
│  (brand selected → show brand products inline)   │
│  (My Catalog → existing tracked products)        │
└──────────────────────────────────────────────────┘
```

## Changes in `BackroomProductCatalogSection.tsx`

1. **New state**: `activeLetter: string | null` — tracks which letter is selected. When a letter is picked, show a secondary row of brand chips filtered to that letter. When a brand is picked from that row, existing `activeBrand` logic kicks in.

2. **Alphabet bar** (replaces brand chips): Render `A`–`Z` as small square buttons. Letters with available brands get normal styling; letters with no brands are dimmed/disabled. "My Catalog" chip stays as the first element.

3. **Brand sub-row**: When `activeLetter` is set and `activeBrand` is null, show a row of brand chips filtered to brands starting with that letter. Clicking a brand sets `activeBrand` (existing logic).

4. **Flow**: My Catalog → (click letter) → see brands for that letter → (click brand) → see brand products with add checkboxes. Breadcrumb-like: `Letter > Brand` shown above the product list so user can go back to letter.

5. **Everything else unchanged** — search, add-to-catalog logic, My Catalog view, tracked products, Supply Library dialog button all stay as-is.

### Computed data
```ts
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const brandsByLetter = useMemo(() => {
  const map = new Map<string, string[]>();
  brands.forEach(b => {
    const letter = b[0].toUpperCase();
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(b);
  });
  return map;
}, [brands]);
```

## Files
| File | Action |
|------|--------|
| `BackroomProductCatalogSection.tsx` | Replace brand chips with alphabet selector + brand sub-row |

