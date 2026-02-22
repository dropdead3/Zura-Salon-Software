

# Appointment Card Readability Overhaul

## Summary of Changes

Make card text larger and more readable, remove the initials avatar, and replace the inline status dot with a badge in the top-right corner showing the status label.

## Changes

### 1. Remove client initials avatar (lines 526-529)

Delete the round avatar circle that shows client initials (e.g., "AB"). The client name text alone provides enough identity.

### 2. Replace inline status dot with top-right badge (lines 514-518)

Remove the small colored dot that currently sits inline with the client name. Instead, add an absolutely-positioned status badge in the top-right corner of the card using the existing `APPOINTMENT_STATUS_BADGE` token map from `design-tokens.ts`. This badge will show text like "Confirmed", "Checked In", "Booked", etc. with matching pastel colors.

### 3. Increase text sizes throughout the non-compact card

- Client name: bump from `text-xs` to `text-sm`
- Service summary line: bump from `text-xs` to `text-sm` (or `text-xs` with slightly larger sizing)
- Time/price row: bump from `text-xs` to `text-sm`

## Technical Details

**File: `src/components/dashboard/schedule/DayView.tsx`**

**Import change:** Add `APPOINTMENT_STATUS_BADGE` from `@/lib/design-tokens`.

**Lines 504-538 (non-compact card content):** Restructure to:

```tsx
{/* Top-right status badge */}
<div className="absolute top-1 right-1 z-20">
  <span className={cn(
    'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
    statusBadge.bg, statusBadge.text
  )}>
    {statusBadge.label}
  </span>
</div>

{/* Client name row - larger text, no avatar, no status dot */}
<div className="text-sm font-medium truncate flex items-center gap-1 pr-16">
  {/* ...icons (redo, recurrence, reschedule, assisting, etc.)... */}
  {appointment.client_name}
  {/* ...NEW badge, phone... */}
</div>

{/* Service summary - slightly larger */}
<div className="text-[13px] opacity-90 truncate">...</div>

{/* Time row - slightly larger */}
<div className="text-[13px] opacity-80 ...">...</div>
```

The `pr-16` on the client name row prevents text from running under the status badge.

The card's content container (line 479) needs `relative` added for the absolute badge positioning.

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Import `APPOINTMENT_STATUS_BADGE`; remove avatar and status dot; add top-right status badge; increase text sizes |
