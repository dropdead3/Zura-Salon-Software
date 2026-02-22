
# Add "Assisted by [name]" Text Below Services Summary

## Summary

Add a text line showing "assisted by [assistant name(s)]" on appointment cards, displayed below the services summary. This gives at-a-glance visibility into who is assisting without needing to hover over the avatar badge.

## Technical Details

**File: `src/components/dashboard/schedule/DayView.tsx`**

After the services summary block (lines 550-558), insert a new conditional block that renders assistant names when present:

```tsx
{/* Assisted by line */}
{(() => {
  const names = assistantNamesMap?.get(appointment.id);
  if (!names || names.length === 0) return null;
  return (
    <div className="text-[11px] opacity-70 truncate">
      assisted by {names.join(', ')}
    </div>
  );
})()}
```

This renders only on non-compact cards (it's inside the non-compact branch) and only when assistant names exist for the appointment. The styling matches the existing info lines: small text, reduced opacity, truncated for overflow.

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Add "assisted by [name]" line after services summary (after line 558) |
