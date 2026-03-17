

## Update brand card hover effect

**Current**: `hover:border-border hover:bg-card hover:shadow-lg` on brand cards (line 1202).

**Change**: Replace with a lighter fill + slight scale-up on hover:

In `BackroomProductCatalogSection.tsx` line 1202, replace:
```
'hover:border-border hover:bg-card hover:shadow-lg',
```
with:
```
'hover:border-border hover:bg-muted/40 hover:scale-[1.02] hover:shadow-sm',
```

This gives a subtle lighter background tint and gentle magnification on hover, consistent with the platform's motion standards (120-160ms transitions already covered by `transition-all duration-200`).

