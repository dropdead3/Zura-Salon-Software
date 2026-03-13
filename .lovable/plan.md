

# Fix "0 tracked" Badge Layout

The badge is rendering `{trackedCount}` and `tracked` as stacked text inside a small badge, creating an awkward tall bubble. Fix: make it a single inline line with `whitespace-nowrap`.

## Change

### `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx` (line 143)

Change the Badge to prevent wrapping:
```tsx
<Badge variant="outline" className="text-xs whitespace-nowrap">
  {trackedCount} tracked
</Badge>
```

Single line change — adds `whitespace-nowrap` to keep the text on one line.

