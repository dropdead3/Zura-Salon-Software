

## Hide Clipping Content on Appointment Cards

### Problem
When an appointment card is too short to fit all its detail lines (service name, time/price, assisted-by, rescheduled-from), the text visually overflows past the card's bottom edge, looking messy.

### Solution
Add `overflow-hidden` to the card's content container so any lines that don't fit are cleanly hidden rather than clipping at the edge.

### Implementation
**1 file**: `src/components/dashboard/schedule/AppointmentCardContent.tsx`

**Change 1** — Line 213, compact size container: add `overflow-hidden`
```tsx
<div className="px-2 py-1 relative z-10 overflow-hidden">
```

**Change 2** — Line 230, medium/full size container: add `overflow-hidden`
```tsx
<div className="px-2 py-1 relative z-10 overflow-hidden" style={...}>
```

This ensures the outer card naturally clips any content that exceeds the card height. The absolute-positioned badges (NC/RC, status) at `top-1` will still be visible since they're at the top. Only bottom-edge content that doesn't fit will be hidden.

### Scope
- Single file, two className additions
- No layout or structural changes
- Cards will look cleaner at all durations

