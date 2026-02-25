

## Fix: Inconsistent Red Shades in New Bookings Card

Good catch — the screenshot shows two different red shades in the same card. The Pipeline critical dot uses Tailwind's hardcoded `bg-red-500` and the "did not" text uses `text-red-400`. These are raw Tailwind reds, not the theme's semantic `destructive` token (`0 62% 50%`). They should both resolve through the theme's `destructive` variable for consistency.

### Changes

**File: `src/components/dashboard/NewBookingsCard.tsx`**

1. **Line 102**: Pipeline critical dot — change `bg-red-500` to `bg-destructive`
2. **Line 169**: "did not" text — change `text-red-400` to `text-destructive`

The other pipeline statuses (`bg-emerald-500` for healthy, `bg-amber-500` for slowing) are semantic status indicators with no theme equivalent, so they remain as-is for now.

### Scope

2 class changes in 1 file. No structural or logic changes.

