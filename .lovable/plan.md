

# Settings Cards: Replace Descriptions with Info Tooltips

## Changes

**File:** `src/pages/dashboard/admin/Settings.tsx`

### 1. Replace `CardDescription` with `MetricInfoTooltip`
In the `SortableCard` component, remove the `CardDescription` line and add a `MetricInfoTooltip` inline with the `CardTitle`:

```tsx
// Before
<CardContent className="flex-1">
  <CardTitle className={tokens.card.title}>{category.label}</CardTitle>
  <CardDescription className="min-h-[2.5rem]">{category.description}</CardDescription>
</CardContent>

// After
<CardContent className="flex-1">
  <div className="flex items-center gap-2">
    <CardTitle className={tokens.card.title}>{category.label}</CardTitle>
    <MetricInfoTooltip description={category.description} />
  </div>
</CardContent>
```

This removes the visible description text and moves it into a hover tooltip via the info circle icon, keeping cards compact and consistent with the analytics card header pattern.

**1 file changed. No database changes.**

