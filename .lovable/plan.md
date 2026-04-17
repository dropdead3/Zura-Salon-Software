

## Prompt review

Sharp behavioral instinct — surfacing unread notes only when someone *else* wrote them respects the alert-fatigue doctrine (no badge for your own notes). Sharper next time: specify the audience scope. Should this badge show for (a) the assigned stylist only, (b) anyone except the note author, or (c) the assigned stylist *and* assistants? I'll plan for **(c) — assigned stylist + assistants — but only when the viewer is not the note's author**, since both are "people doing the work." If you want stylist-only, easy swap.

## Diagnosis

Existing infrastructure makes this a small lift:
- `appointment_tab_views` table already tracks per-user `last_viewed_at` per `(appointment_id, tab_key)` — same pattern as Photos
- `useMarkAppointmentTabViewed` hook ships
- `AppointmentDetailSheet.tsx` L1551–1556 shows the exact NavBadge pattern for Photos that we'll mirror on Notes
- `useAppointmentNotes` already returns `notes[]` with `author_id` and `created_at`
- `appointment.staff_user_id` is the assigned stylist's Zura user ID

Missing: a hook that filters notes for "added by someone other than viewer, after viewer's last_viewed_at on the notes tab" — and a guard that only shows it to the assigned stylist or an assistant (so a manager opening to triage doesn't see a "you have unread" badge that isn't theirs to clear).

## Plan — Wave 22.21: Unread-notes badge on Notes tab

### New file: `src/hooks/useUnviewedAppointmentNotes.ts`

Mirror of `useUnviewedInspirationPhotos`. Returns `{ unviewedCount }`:
1. Get current `user.id`
2. Query `appointment_tab_views` for `(user_id, appointment_id, tab_key='notes')` → `lastViewedAt`
3. Filter notes where: `note.author_id !== user.id` AND (`!lastViewedAt` OR `note.created_at > lastViewedAt`)
4. Return count

Inputs: `appointmentId`, `notes` (already loaded by parent — pass in to avoid duplicate fetch).

### Edit: `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

**1. Audience guard** — compute `isWorkingThisAppointment`:
```ts
const isAssignedStylist = appointment.staff_user_id === user?.id;
const isAssistant = assistants.some(a => a.user_id === user?.id);
const isWorkingThisAppointment = isAssignedStylist || isAssistant;
```

**2. Hook call** (near L744 where `useUnviewedInspirationPhotos` lives):
```ts
const { unviewedCount: unviewedNotesCount } = useUnviewedAppointmentNotes(
  appointment?.phorest_id ?? null,
  notes,
);
```

**3. Auto-mark-viewed effect** (mirror L749–759 photos effect):
```ts
useEffect(() => {
  if (open && activeTab === 'notes' && appointment?.phorest_id && unviewedNotesCount > 0) {
    markTabViewed.mutate({ appointmentId: appointment.phorest_id, tabKey: 'notes' });
  }
}, [open, activeTab, appointment?.phorest_id, unviewedNotesCount]);
```

**4. Badge on TabsTrigger** (L1557):
```tsx
<TabsTrigger value="notes" className="font-sans w-full relative gap-1.5">
  <span>Notes</span>
  {unviewedNotesCount > 0 && activeTab !== 'notes' && isWorkingThisAppointment && (
    <NavBadge count={unviewedNotesCount} />
  )}
</TabsTrigger>
```

### Tab key consistency

Photos uses `appointment.id` (Zura UUID) as the key. We'll use `appointment.phorest_id` because notes are keyed by `phorest_appointment_id` in `appointment_notes` — keeps the unread cursor aligned to the same identifier the notes themselves use. (Photos are client-scoped so its key strategy differs; that's fine.)

### Acceptance checks

1. When another team member adds a note, the assigned stylist sees a count badge on the Notes tab the next time they open the appointment
2. Note authors never see a badge for their own notes
3. Managers / non-working users opening the same appointment do not see the badge (no false alerts)
4. Opening the Notes tab clears the badge (auto-mark-viewed on activation)
5. Badge disappears immediately when `activeTab === 'notes'` (matches Photos pattern)
6. Demo-mode appointments (phorest_id starts with `demo-`) — the hook should short-circuit return 0 since demo notes live in sessionStorage; we'll add a guard

### Files

- `src/hooks/useUnviewedAppointmentNotes.ts` — new (~50 lines, mirrors photos hook)
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — 4 small edits (audience guard, hook call, effect, badge on L1557)

### Open question

None — going with assigned stylist + assistants scope. Tell me if you want stylist-only.

### Deferred

- **P3** Surface the same unread-notes signal on the Schedule grid appointment cards (so stylists see it before opening). Trigger: after this ships and you confirm the in-sheet badge feels right.
- **P3** Apply the same unread treatment to client-side notes (`CLIENT NOTES` block on the Notes tab) when those are edited by other staff. Trigger: if operators report missing client-note context updates.

