

## Add Hours Display to All Duration Values

Currently, durations like "330m" are hard to read. They should show hours too, e.g. "5h 30m". One file (`ConfirmStep.tsx`) already does this — we need a shared utility and apply it everywhere.

### 1. Create shared `formatMinutesToDuration` utility

New file: `src/lib/formatDuration.ts`

```typescript
/** 330 → "5h 30m", 45 → "45m", 60 → "1h", 90 → "1h 30m" */
export function formatMinutesToDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
```

### 2. Update all duration display locations

**Files to update** (replace raw `{x}m` with `formatMinutesToDuration(x)`):

| File | What changes |
|------|-------------|
| `src/components/dock/schedule/DockNewBookingSheet.tsx` | 3 spots: line 827 (service chip), line 876 (summary bar), line 1016 (Duration detail row), line 1055 (confirm service list) |
| `src/components/dashboard/schedule/booking/ServiceStep.tsx` | Line 120: individual service duration |
| `src/components/dashboard/schedule/booking/ConfirmStep.tsx` | Lines 144-147: replace inline logic with the shared util |
| `src/components/dashboard/schedule/ServiceAddonToast.tsx` | Line 69: addon duration |
| `src/components/dashboard/schedule/meetings/MeetingCard.tsx` | Line 122: meeting duration |
| `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Lines 1125, 1172, 2051: appointment/service durations |
| `src/components/dashboard/settings/ServicesSettingsContent.tsx` | Lines 675, 745, 817: service list durations |
| `src/components/dashboard/sales/RevPerHourByCategoryChart.tsx` | Line 255: avg duration column |

Each change is mechanical: import the utility and replace `{value}m` / `{value}min` with `{formatMinutesToDuration(value)}`.

