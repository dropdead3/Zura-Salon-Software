

## Fix Services Manager Inspector Layout

### Problem
Category names in the accordion use `font-display` (Termina, uppercase, wide tracking), which is too heavy for an inspector sidebar context. User wants Aeonik Pro in normal capitalization.

### Change: `src/components/dashboard/website-editor/ServicesContent.tsx`

**Line 447** — Change the category heading class:

```diff
- <h3 className="font-display font-medium uppercase tracking-wide">{category.categoryName}</h3>
+ <h3 className="font-sans font-medium text-sm">{category.categoryName}</h3>
```

This switches from Termina (uppercase, wide tracking) to Aeonik Pro (normal caps, standard spacing), which fits the inspector panel density better and matches how other inspector labels use `font-sans`.

Single line change, no structural risk.

