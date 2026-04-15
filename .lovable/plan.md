

## Remove Gradient Fade Below Stylist Name Bar

### Fix
**1 file**: `src/components/dashboard/schedule/DayView.tsx`

**Line 493** — Delete the gradient fade div:
```tsx
// Remove this line entirely:
<div className="h-3 bg-gradient-to-b from-muted/40 to-transparent pointer-events-none sticky top-[52px] z-[19]" />
```

Also remove the comment on line 492 (`{/* Gradient fade below header */}`).

