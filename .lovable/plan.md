

## Remove Star from Category Headers

### Problem

The screenshot shows "SALES" with a star AND "Overview" with a star -- double stars that are redundant. The category header should look like a plain grouping label without a star. Only the actual navigable subtab links should show stars.

### Change

**`src/components/dashboard/CollapsibleNavGroup.tsx`** -- line 296

Remove the `<Star>` icon from the category header `<div>`. Keep the stars on the Overview link (line ~318) and subtab links (line ~349) unchanged.

Before:
```tsx
<span className="flex-1">{group.tabLabel}</span>
<Star className="w-3 h-3 fill-current opacity-40" />
```

After:
```tsx
<span className="flex-1">{group.tabLabel}</span>
```

One line deleted. No other files affected.

