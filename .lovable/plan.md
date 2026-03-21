

## Fix Flask Icon Z-Index to Slide Visibly

**Problem:** The flask icon is correctly placed inside the sliding `motion.div` (z-10), but the static text overlay sits at `z-20` on top of it — visually hiding the icon's movement and making it appear stationary.

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx`

**Fix:** Change the flask icon container's z-index from `z-10` to `z-30` so it renders above the static text overlay (z-20) and its sliding motion is visible.

**Line 114** — Change `z-10` to `z-30`:
```tsx
<div className="absolute top-4 right-4 z-30 flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600/20">
```

Single class change on one line.

