

# Add Indented L-Hook Before "Assisted by"

## Summary

Add a visual "L" hook (└) before the "Assisted by" text to visually indicate it's a child detail of the services summary above it.

## Technical Details

**File: `src/components/dashboard/schedule/DayView.tsx`**

**Line 564** -- Update the "Assisted by" div to include left padding and an L-hook character:

Before:
```tsx
<div className="text-[11px] opacity-70 truncate">
  Assisted by {names.join(', ')}
</div>
```

After:
```tsx
<div className="text-[11px] opacity-70 truncate flex items-center gap-1">
  <span className="opacity-50">└</span> Assisted by {names.join(', ')}
</div>
```

The `└` character acts as the L-hook, with slightly reduced opacity so it reads as a structural connector rather than content. The flex layout keeps the hook and text aligned on the same baseline.

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Add └ character before "Assisted by" text (line 564) |

