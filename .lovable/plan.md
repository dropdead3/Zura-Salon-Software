

## Rearrange Card Layout — Services Next to Name, Time + Duration Below

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx`

### New Layout

```text
┌──────────────────────────────────────────┐
│  Sarah Mitchell · Balayage + Toner    🧪 │
│  9:14 – 10:44 AM · 1h 30m               │
│  Assisted by Alexis R.                   │
└──────────────────────────────────────────┘
```

### Changes

1. **Top row**: Client name + service name (separated by `·`), truncated together
2. **Second row**: Time range + computed duration in "Xh Xm" format (e.g., "1h 30m"), muted text, separated by `·`
3. **Third row**: Assistant label (unchanged)

**Duration calculation**: Compute minutes between `start_time` and `end_time` using date-fns `differenceInMinutes`, then format with the existing `formatMinutesToDuration` utility from `src/lib/formatDuration.ts`.

**Imports to add**: `differenceInMinutes`, `parse` from date-fns; `formatMinutesToDuration` from `@/lib/formatDuration`.

Apply to both the invisible spacer div and the visible `motion.div` overlay.

