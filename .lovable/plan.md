

## Fix Appointment Card Content Clipping

### Problem
Despite adding `overflow-hidden`, appointment cards still show messy partial text at the bottom edge. The root causes are:
1. The `GridContent` inner container has no height constraint — it grows with content, then gets hard-clipped mid-line by the outer `overflow-hidden`, leaving ugly partial text.
2. Service band labels (`bottom-0 right-1` absolute text) overlap with the main content text, creating visual clutter.
3. Detail lines (assisted-by, time+price, rescheduled-from) render regardless of available space.

### Solution
Use size-aware content rendering: only show detail lines that fit at each card size, eliminating partial clipping entirely.

### Implementation
**1 file**: `src/components/dashboard/schedule/AppointmentCardContent.tsx`

**Change 1** — GridContent inner container (line 230): add `h-full` so it's bounded by the card height
```tsx
<div className="px-2 py-1 relative z-10 overflow-hidden h-full">
```

**Change 2** — Conditionally hide detail lines based on `size` and `duration`:
- **Compact** (≤30min): Already only shows client name — no change.
- **Medium** (31-59min): Show NC/RC badge, status badge, client name, and service line only. Hide assisted-by, time+price, and rescheduled-from lines.
- **Full** (60min+): Show everything as today.

Lines 311-340 — wrap the assisted-by, time+price, and rescheduled lines in size checks:
```tsx
{/* Assisted by line — full size only */}
{size === 'full' && (() => { ... })()}

{/* Time + price — already gated to full */}
{size === 'full' && ( ... )}

{/* Rescheduled from — full size only */}
{size === 'full' && duration >= 45 && ... }
```

**Change 3** — Service band labels (line 635-641): hide band name labels when duration < 60 (already gated, confirmed correct) AND add a secondary gate so labels don't render when size is `medium`:
```tsx
{size === 'full' && duration >= 60 && (
  <span className="absolute bottom-0 right-1 text-[9px] ...">
    {band.name}
  </span>
)}
```
This requires passing `size` to the service bands block — currently it only checks `duration >= 60`. We'll thread `size` or just keep the duration check since `full` = 60+ already aligns.

### Result
Cards at every duration will show only the content that cleanly fits, with no partial text clipping at the bottom edge. The hierarchy is: badges → client name → service → (full only) details.

