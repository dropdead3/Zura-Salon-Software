

## Move Action Buttons Above Filters

### What
Separate the Export, Import, and Add Product buttons from the filter row into their own row at the top of the `ProductsTab`, creating a cleaner two-row layout:
- **Row 1**: Product count + Export / Import / History / Add Product buttons (right-aligned)
- **Row 2**: Search + filter dropdowns + Low Stock toggle + drafts

### Change

**File:** `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` — `ProductsTab` return block (lines ~238–336)

Restructure the current single `flex-wrap` div into two separate rows:

```
Row 1:  [product count label]                    [Export] [Import] [History?] [+ Add Product]
Row 2:  [Search input] [Category ▾] [Brand ▾] [Type ▾] [Location ▾] [Low Stock toggle] [Drafts?]
```

1. Move lines 302–315 (Export, Import, History, Add Product buttons) into a new `div` above the filters row, with `justify-between` — count on the left, buttons on the right
2. Move the "Showing X of Y" count (lines 329–336) into that same top row on the left side
3. Keep the search + filters row as-is (lines 240–301), minus the action buttons

Single file, layout-only change. No logic changes.

