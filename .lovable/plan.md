

## Capitalize Category Names in Stock Tab Dropdown

### Problem
Category names display as raw slugs (e.g., `color-remover`, `developer`) — need title case with dashes replaced by spaces (e.g., `Color Remover`, `Developer`).

### Change

**File:** `src/components/dashboard/backroom-settings/inventory/StockTab.tsx` (line 297)

Add a simple formatting helper and apply it to the category display label:

```tsx
// Helper: "color-remover" → "Color Remover"
function formatCategoryLabel(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
```

Update the `SelectItem` render:
```tsx
<SelectItem key={c} value={c}>
  {c === 'all' ? 'All Categories' : formatCategoryLabel(c)}
</SelectItem>
```

This is display-only — the underlying filter value stays as-is so queries are unaffected.

| File | Action |
|------|--------|
| `StockTab.tsx` | **Edit** — Add format helper, apply to category labels |

