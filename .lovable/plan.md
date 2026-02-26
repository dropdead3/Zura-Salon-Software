

## Fix #1 Performer Emphasis: Elevation/Contrast Only, No Dimension Changes

### Diagnosis

The current rank #1 row has `py-0.5` in its row styles, which changes padding and makes the row a different size than ranks #2/#3. This violates size equality. The `ring` and `shadow` treatments are correct in principle but need to exist without any padding override.

### Technical Changes

**File: `src/components/dashboard/sales/TopPerformersCard.tsx`**

**1. Remove `py-0.5` from rank 1 row styles** (line 36)

```
Current: 'border-l-2 border-l-chart-4/60 ring-1 ring-chart-4/10 shadow-sm py-0.5'
New:     'border-l-2 border-l-chart-4/60 ring-1 ring-chart-4/10 shadow-sm'
```

This ensures identical padding across all ranks. The elevation (`shadow-sm`) and accent stroke (`ring-1 ring-chart-4/10`) remain as the only differentiators.

**2. Revenue text contrast — already correct** (line 233)

The conditional `text-foreground` for rank 1 is a contrast-only change (no size change). This stays as-is.

**3. Progress bar opacity — already correct** (line 241)

`bg-primary` for rank 1 vs `bg-primary/70` for others is contrast-only. This stays as-is.

### Validation

After this single-line fix:
- Row height: identical across all ranks (all use base `p-2.5`)
- Padding: identical (no `py-0.5` override)
- Font sizes: identical (`text-sm` for name and revenue across all ranks)
- Progress bar height: identical (`h-1` for all)
- Only differences: shadow elevation, ring stroke, revenue text brightness, progress bar opacity

### Files Changed

| File | Action |
|------|--------|
| `src/components/dashboard/sales/TopPerformersCard.tsx` | Remove `py-0.5` from rank 1 row style (line 36) |

