## Problem
The past-slot hover badge renders "CANNOT SCHE…" — truncated and forced uppercase — because it uses `font-display` (Termina, uppercase, `tracking-wide`) which is too wide for the slot's width budget.

## Root Cause
`src/components/dashboard/schedule/DayView.tsx` line 184 applies `font-display font-medium tracking-wide` + `truncate` to the badge regardless of variant. Termina's uppercase + wide tracking overflows the slot, then `truncate` cuts to "CANNOT SCHE…".

## Fix
Branch the badge typography by variant:

- **Past slot** ("Cannot schedule in the past"): switch to `font-sans` (Aeonik Pro), sentence case, no wide tracking, `whitespace-nowrap`, generous `max-w-[260px]` so the full sentence renders.
- **Time slots** (current/future): keep `font-display tracking-wide` — short numeric labels like "10:30 AM" are exactly what Termina is for.

### Code change (lines 181–190)
```tsx
{showBadge && (
  <div
    className={cn(
      'pointer-events-none absolute left-1/2 -top-8 z-40 w-max -translate-x-1/2 rounded px-2 py-1 text-center text-xs font-medium shadow',
      isPastSlot
        ? 'bg-muted-foreground text-white font-sans max-w-[260px] whitespace-nowrap'
        : 'bg-foreground text-background font-display tracking-wide truncate max-w-[calc(100%-8px)]'
    )}
  >
    {badgeLabel}
  </div>
)}
```

## Files
- `src/components/dashboard/schedule/DayView.tsx` (lines 181–190)

## Doctrine Check
- Aeonik Pro (`font-sans`) for sentence-case messaging — matches typography canon ("font-sans NEVER uppercase" → sentence case is the correct pairing).
- Termina (`font-display`) reserved for short uppercase time labels where it earns its width cost.
- Calm UI: full sentence visible, no ellipsis ambiguity.