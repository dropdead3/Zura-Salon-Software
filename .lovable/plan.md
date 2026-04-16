

# Height-Aware Appointment Cards

## Problem
Appointment cards decide what content to show based on **duration in minutes** — not actual pixel height. A 60-minute appointment at zoom level 0 has ~80px of height, but the same 60 minutes at zoom level 2 has ~240px. The card shows the same content in both cases, wasting space when there's plenty of room, or cramming content when space is tight.

The `GridContent` component has hardcoded duration thresholds like `duration >= 60` for time/price, `duration >= 75` for assistant names, and `duration >= 90` for reschedule info. These don't reflect actual available pixel space.

## Solution
Replace duration-based content gating with **pixel-height-based** thresholds. The pixel height is already computed by `getEventStyle` — pass it through to `AppointmentCardContent` and use it for content visibility decisions.

## Changes

### 1. `AppointmentCardContent.tsx` — Add `pixelHeight` prop and height-based rendering

- Add optional `pixelHeight?: number` to `AppointmentCardContentProps`
- Update `getCardSize` to accept `pixelHeight` as an alternative input — when provided, use pixel thresholds instead of duration thresholds:
  - `compact`: < 28px
  - `medium`: 28–54px
  - `full`: ≥ 55px
- Replace duration gates inside `GridContent` with pixel-height gates:
  - Service line: show when `pixelHeight >= 40` (instead of always for medium+)
  - Time + price row: show when `pixelHeight >= 65` (instead of `duration >= 60`)
  - Assisted-by line: show when `pixelHeight >= 85` (instead of `duration >= 75`)
  - Reschedule info: show when `pixelHeight >= 105` (instead of `duration >= 90`)
  - Multi-service breakdown: show when `pixelHeight >= 70` (instead of `duration >= 60`)

### 2. `DayView.tsx` — Pass computed pixel height

- After `getEventStyle`, parse the numeric height from the style and pass it as `pixelHeight` to `AppointmentCardContent`

### 3. `WeekView.tsx` — Pass computed pixel height

- Same approach: parse height from `getEventStyle` result and pass `pixelHeight`

## Technical Detail
The height is already computed as `(duration / slotInterval) * rowHeight` inside `getEventStyle`. We extract the numeric value and thread it through:

```tsx
const eventStyle = getEventStyle(appointment.start_time, appointment.end_time, hoursStart, rowHeight, slotInterval);
const pixelHeight = parseInt(eventStyle.height);

<AppointmentCardContent
  pixelHeight={pixelHeight}
  size={pixelHeight < 28 ? 'compact' : pixelHeight < 55 ? 'medium' : 'full'}
  ...
/>
```

This ensures that at high zoom levels, even 30-minute appointments show full details when there's plenty of vertical space, and at low zoom levels, even 60-minute appointments stay clean when pixel space is limited.

### Files Modified
1. `src/components/dashboard/schedule/AppointmentCardContent.tsx` — add `pixelHeight` prop, replace duration gates with pixel-height gates
2. `src/components/dashboard/schedule/DayView.tsx` — compute and pass `pixelHeight`
3. `src/components/dashboard/schedule/WeekView.tsx` — compute and pass `pixelHeight`

