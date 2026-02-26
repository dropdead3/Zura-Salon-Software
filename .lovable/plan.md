

## Add Status Badges and Action Prompts to Today's Prep Card

### What This Does
Each appointment row in the compact Today's Prep dashboard card will now display the appointment status (Booked, Confirmed, Checked In, etc.) as a colored badge, along with a contextual action prompt for unconfirmed appointments telling the stylist what to do next (e.g., "Call to confirm").

### Current State
- The `useTodayPrep` hook already fetches `status` for every appointment and filters out cancelled/no-show
- The `TodaysPrepSection` component currently shows: time, client name, CLV tier, visit count
- `APPOINTMENT_STATUS_BADGE` tokens already exist in `design-tokens.ts` with `bg`, `text`, `border`, and `label` for each status

### Changes

**Single file edit**: `src/components/dashboard/TodaysPrepSection.tsx`

1. Import `APPOINTMENT_STATUS_BADGE` from `@/lib/design-tokens` and `Phone, MessageSquare` icons from `lucide-react`

2. Add a status-to-action mapping:
   - `booked` → "Confirm" with Phone icon (amber accent, most urgent)
   - `pending` → "Confirm" with Phone icon
   - `confirmed` → No action needed (green checkmark feel)
   - `checked_in` → No action needed
   - `completed` → No action needed

3. For each appointment row, add:
   - A compact status badge using `APPOINTMENT_STATUS_BADGE` colors (after the time, before client name) — `text-[10px]` pill style matching existing badge pattern
   - For `booked`/`pending` status: a small "Confirm" action hint text with Phone icon, placed at the right side of the row, replacing the visit count position to keep the row clean

4. Row layout becomes:
```text
9:00 AM  [Booked]  Jane Doe  ★NEW  Gold  📞 Confirm
10:30 AM [Confirmed] Mark T.        Silver  12 visits
```

- Unconfirmed appointments get the action prompt instead of visit count (visit count is still visible on the full prep page)
- Confirmed/checked-in appointments show visit count as before
- The status badge is always visible regardless of confirmation state

### No hook changes needed
The `status` field is already available in the `PrepAppointment` interface and populated by the hook. The hook currently filters out `cancelled` and `no_show`, so the statuses that will appear are: `booked`, `pending`, `confirmed`, `checked_in`, `completed`.

### Note on the filter
The current hook filters `not('status', 'in', '("cancelled","no_show")')`. Since we want to show status context, this is correct — we only show actionable appointments. If you later want cancelled appointments visible for awareness, that would be a separate change to the hook.

### Files Changed

| File | Action |
|------|--------|
| `src/components/dashboard/TodaysPrepSection.tsx` | Edit — add status badge + action prompt per row |

