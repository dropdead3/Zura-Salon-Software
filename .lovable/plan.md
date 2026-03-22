

## Split No-Show & Cancelled Into Separate Groups with Status Badges

**Problem:** Currently, `no_show` and `cancelled` appointments are lumped into the "Completed" group with no visual distinction. After marking an appointment as no-show or cancelled, it should appear in its own clearly labeled section with a status badge.

### Changes

**File: `src/components/dock/schedule/DockScheduleTab.tsx`**

1. **Update `groupAppointments`** — split the current `completed` bucket into three: `completed`, `noShow`, `cancelled`

```ts
function groupAppointments(appointments) {
  const active = [], scheduled = [], completed = [], noShow = [], cancelled = [];
  for (const a of appointments) {
    const status = a.status || 'pending';
    if (ACTIVE_STATUSES.includes(status)) active.push(a);
    else if (status === 'no_show') noShow.push(a);
    else if (status === 'cancelled') cancelled.push(a);
    else if (status === 'completed') completed.push(a);
    else scheduled.push(a);
  }
  return { active, scheduled, completed, noShow, cancelled };
}
```

2. **Render new groups** after "Completed" with distinct accent colors:
   - No-Show: `amber` accent, label "No Show"
   - Cancelled: `red` accent, label "Cancelled"

3. **Extend `accentColor` type** in `AppointmentGroup` to include `'amber' | 'red'` and add dot colors for them.

**File: `src/components/dock/schedule/DockAppointmentCard.tsx`**

4. **Add a status badge** on cards when status is `no_show` or `cancelled`:
   - Small pill badge in the top-right of the card content: "No Show" (amber) or "Cancelled" (red)
   - Uses the existing `DOCK_CARD` token pattern with inline color

Two files, additive changes. Grouping logic update + badge rendering.

