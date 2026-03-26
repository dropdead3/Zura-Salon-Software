

## Simplify Product Picker: Brand → Category → Product Flow

### Problem
The current product picker shows a flat search list grouped by brand — users must type to find products. This is overwhelming when catalogs are large and doesn't match the mental model of "I'm using Brand X's color line."

### Solution
Replace the flat search dropdown with a 3-step drill-down picker inside each bowl:

```text
Step 1: Select Brand          Step 2: Select Category       Step 3: Pick Products
┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│ [Search brands...]   │      │ ← Danger Jones       │      │ ← Toner              │
│                      │      │                      │      │                      │
│  Danger Jones    12  │      │  Color          8    │      │ ● Cool Blonde   57g  │
│  Goldwell        24  │      │  Toner          3    │      │   $0.13/g    [Add]   │
│  Redken          18  │      │  Developer      1    │      │ ● Silver        57g  │
│                      │      │                      │      │   $0.13/g    [Add]   │
└──────────────────────┘      └──────────────────────┘      └──────────────────────┘
```

### Changes — `AllowanceCalculatorDialog.tsx`

1. **Replace `bowlSearches` + `devFilterBowls` state** with a per-bowl picker state tracking `{ step: 'brand' | 'category' | 'product', selectedBrand: string | null, selectedCategory: string | null, search: string }`

2. **Derive brand list** from `catalogProducts` — group by brand with product counts, sorted alphabetically. Show as clickable rows with a search filter at the top.

3. **On brand click → show categories** for that brand (derived from `catalogProducts.filter(p => p.brand === selected)`). Show a back button with the brand name. Each category row shows product count.

4. **On category click → show products** in that brand+category. Each product row shows swatch, name, cost/g, and a single "Add" button (auto-detect developer via `isDeveloperProduct`).

5. **Keep the search input** at every step — it filters the current level (brands, categories, or products).

6. **Remove the "Color" / "Dev" dual buttons** on product rows — instead auto-detect developer products and add them as developers automatically. This removes a decision point for users.

7. **"Quick Add Developer" button** still works — clicking it navigates the picker to brand step with a developer-only filter flag.

8. **Back navigation** at each step via a breadcrumb-style header: `Brands > Danger Jones > Toner`

### Files Modified
- `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

