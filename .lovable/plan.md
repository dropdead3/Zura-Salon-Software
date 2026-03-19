

# Add Progress Percentage and Cancel to Multi-Location Exports

## Summary
Enhance the multi-location export loops in StockTab and CountsTab with a visual progress percentage in the toast and an `AbortController`-based cancel mechanism.

## Changes

### 1. `StockTab.tsx` — Both combined and separate export loops
- Create an `AbortController` before the loop; store its signal in a ref so a toast action can trigger abort
- Update `toast.loading` to show percentage: `"Exporting… 3/5 (60%)"` with a **Cancel** action button
- After each iteration, check `signal.aborted` — if true, break out of the loop, dismiss toast, show `toast.info('Export cancelled')`
- On cancel during ZIP path: skip `zip.generateAsync` and download

### 2. `CountsTab.tsx` — Multi-location ZIP export loop
- Same pattern: `AbortController` + cancel action in toast + percentage display + early break on abort

### Toast format
```
Exporting Downtown (3 of 5 — 60%)…    [Cancel]
```

### Files to edit
1. `src/components/dashboard/backroom-settings/inventory/StockTab.tsx`
2. `src/components/dashboard/backroom-settings/inventory/CountsTab.tsx`

