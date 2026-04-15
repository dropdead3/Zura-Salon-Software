

## Fix: Appointments Overlapping Stylist Name Bar

### Problem
Appointment cards and the sticky stylist header both use `z-10`. When scrolling, appointment cards render on top of the frosted-glass name bar instead of sliding underneath it.

### Fix
**1 file**: `src/components/dashboard/schedule/DayView.tsx`

**Line 469** — Bump the sticky header z-index from `z-10` to `z-20`:
```tsx
// Before
<div className="flex border-b sticky top-0 z-10" ...>

// After
<div className="flex border-b sticky top-0 z-20" ...>
```

**Line 493** — Bump the gradient fade from `z-[9]` to `z-[19]` to stay just below the header:
```tsx
// Before
<div className="h-3 ... sticky top-[52px] z-[9]" />

// After
<div className="h-3 ... sticky top-[52px] z-[19]" />
```

**Line 625** — The current-time red line already uses `z-20`; bump it to `z-[15]` so it stays between cards and header:
```tsx
// Before
className="... z-20"

// After
className="... z-[15]"
```

### Z-index hierarchy after fix
| Element | Z-index |
|---------|---------|
| Appointment cards | 10 |
| Current time line | 15 |
| Gradient fade | 19 |
| Stylist header | 20 |
| Tooltips | 40 |
| Drag overlay | 50 |

Cards stay at `z-10` and slide under the `z-20` header on scroll. No other files affected.

