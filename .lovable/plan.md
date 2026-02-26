

## Fix "Not Set" Text Size in Goals Overview Header

The fix is a single line change in `GoalsOverviewHeader.tsx`.

### Problem
The "Not set" text uses `tokens.kpi.value` (`font-display text-xl font-medium`) -- the same large stat style used for actual goal counts. This makes the empty state visually heavy and disproportionate.

### Change

**File: `src/components/dashboard/goals/GoalsOverviewHeader.tsx`** (line 47)

Replace the current conditional className:
```tsx
// Before
<span className={cn(tokens.kpi.value, count === 0 && 'text-muted-foreground')}>
  {count === 0 ? 'Not set' : `${count} goal${count > 1 ? 's' : ''}`}
</span>

// After
<span className={count === 0 ? tokens.body.muted : tokens.kpi.value}>
  {count === 0 ? 'Not set' : `${count} goal${count > 1 ? 's' : ''}`}
</span>
```

`tokens.body.muted` resolves to `font-sans text-sm text-muted-foreground` -- appropriately subdued for an empty state. When goals exist, the value retains the full `tokens.kpi.value` style.

The `cn()` import can also be removed since it's no longer used in this file.

