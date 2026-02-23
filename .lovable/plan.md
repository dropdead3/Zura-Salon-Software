

## Add Upcoming Appointments Card to Client Detail Sheet

### What This Adds

A dedicated "Upcoming Appointments" card positioned above the tabs section in the Client Detail Sheet. It filters the already-fetched visit history data to show only future-dated, non-cancelled appointments, giving operators immediate visibility into what is scheduled for this client.

### Implementation

#### 1. Filter Future Appointments from Existing Data

No new query needed. The `useClientVisitHistory` hook already fetches all appointments sorted by date descending. We filter client-side:

```typescript
const today = new Date().toISOString().split('T')[0];
const upcomingVisits = (visitHistory || []).filter(
  v => v.appointment_date >= today && v.status !== 'cancelled'
);
```

#### 2. Add Upcoming Appointments Card (ClientDetailSheet.tsx)

Insert a new card between the "View All Appointments" button (line 1171) and the Tabs section (line 1185). Only renders when `upcomingVisits.length > 0`:

- Card header: Calendar icon + "Upcoming Appointments" title (font-display, tokens.card.title)
- Each appointment rendered as a compact row showing:
  - Date (formatted via `formatDate`)
  - Time (12h format)
  - Service name
  - Stylist name (if available)
  - Status badge
- Card footer: count label ("2 upcoming") for quick scanning
- Each row is clickable and navigates to the Appointments Hub filtered to that client:
  ```
  /dashboard/appointments-hub?tab=appointments&search={clientName}
  ```

#### 3. Visual Treatment

- Same glass card style as other cards: `bg-card/80 backdrop-blur-xl border-border/60`
- Compact rows with `space-y-2` spacing
- Calendar icon in `w-10 h-10 bg-muted rounded-lg` container per card header canon
- Status uses existing `STATUS_CONFIG` color mapping from `VisitHistoryTimeline`
- Font weight stays at `font-medium` maximum

### Files Modified

- `src/components/dashboard/ClientDetailSheet.tsx` -- add upcoming appointments card between "View All Appointments" button and tabs

### What Does NOT Change

- No new hooks or queries (reuses existing `visitHistory` data)
- No database changes
- Existing "View All Appointments" button remains
- Visit History tab remains unchanged
