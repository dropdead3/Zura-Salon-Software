
# Dual Labels: Band Corner Labels + Top Service Summary

## What Changes

1. **Keep the service summary line at the top** (already working) -- the "Full Balayage 270min + Blowout 30min + Maintenance Cut 30min" text stays in the card content area below the client name.

2. **Add small labels in the bottom-right corner of each color band** -- each band gets a short service name label anchored to its bottom-right, giving a quick visual key for which color corresponds to which service.

## Technical Details

**File: `src/components/dashboard/schedule/DayView.tsx`**

**Change 1 (line 466):** Replace the empty comment inside each color band div with a bottom-right label:

```tsx
<div
  key={i}
  className="relative overflow-hidden"
  style={{
    flex: `${band.percent} 0 0%`,
    backgroundColor: bandDark ? bandDark.fill : band.color.bg,
  }}
>
  {duration >= 60 && (
    <span
      className="absolute bottom-0 right-1 text-[9px] opacity-70 truncate max-w-[90%] text-right"
      style={{ textShadow: '0 0 3px rgba(0,0,0,0.15)' }}
    >
      {band.name}
    </span>
  )}
</div>
```

- Labels show the service name only (no duration -- that's already in the top summary)
- Positioned bottom-right so they don't compete with the top-left card content (client name, summary)
- Small font (9px) and reduced opacity to stay subtle
- Only shown on cards 60min or longer (same existing threshold)

**No other changes** -- the top summary line (lines 534-537) remains as-is.

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Add bottom-right service name labels inside each color band div (line 466) |
