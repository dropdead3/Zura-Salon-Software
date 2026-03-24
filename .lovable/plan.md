

## Replace Mix Icon with Bowl Count Badge on Active Cards

**Goal:** Replace the FlaskConical icon on active appointment cards with a descriptive text badge like "No bowls mixed", "1 bowl mixed", "2 bowls mixed".

### Change 1 — `src/hooks/dock/useDockAppointments.ts`

**Expand `has_mix_session` to `mix_bowl_count`:**

- Update the `DockAppointment` interface: replace `has_mix_session?: boolean` with `mix_bowl_count?: number`
- In the mix session query (line ~246), also fetch bowl counts by joining `mix_bowls`:
  ```sql
  select appointment_id, mix_sessions.id
  from mix_sessions
  left join mix_bowls on mix_bowls.mix_session_id = mix_sessions.id
  ```
  Or simpler: after getting active session IDs, run a second query on `mix_bowls` counting bowls per session, then map back to appointment IDs
- Alternatively (simpler approach): query `mix_bowl_projections` grouped by session to get counts, since projections already exist
- Map the count onto each appointment as `mix_bowl_count`

**Simplest approach:** After fetching active session IDs, fetch bowl counts from `mix_bowls` for those sessions:
```ts
const { data: bowls } = await supabase
  .from('mix_bowls')
  .select('mix_session_id')
  .in('mix_session_id', sessionIds);

// Build map: appointment_id -> bowl count
```

### Change 2 — `src/hooks/dock/dockDemoData.ts`

Update demo appointments to use `mix_bowl_count` instead of `has_mix_session`:
- Rachel Kim: `mix_bowl_count: 2`
- Sarah Mitchell: `mix_bowl_count: 1`
- Completed appointments with mix: `mix_bowl_count: 3`, etc.
- Others: `mix_bowl_count: 0`

### Change 3 — `src/components/dock/schedule/DockAppointmentCard.tsx`

Replace the FlaskConical icon block (lines 288-292) with a text badge:

```tsx
{(appointment.mix_bowl_count ?? 0) >= 0 && !TERMINAL_STATUSES.includes(...) && (
  <div className="absolute top-5 right-5 px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 text-xs font-medium whitespace-nowrap">
    {appointment.mix_bowl_count === 0
      ? 'No bowls mixed'
      : `${appointment.mix_bowl_count} bowl${appointment.mix_bowl_count === 1 ? '' : 's'} mixed`}
  </div>
)}
```

- Remove `FlaskConical` import if no longer used
- Update the spacer div (line 169) that reserves room for the icon — adjust width to match badge width
- Only show badge on active (non-terminal) chemical/mix appointments

Three files changed.

