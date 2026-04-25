## Goal

When a user taps **Rebook** anywhere in the appointment detail drawer (terminal-state primary CTA, action menu, or kebab), present a lightweight interval picker first — `2 / 4 / 6 / 8 / 12` weeks out **or** a calendar date picker — then continue into the existing `QuickBookingPopover` flow (service selection, time, confirm) with the chosen date pre-filled.

Today, tapping Rebook closes the detail sheet and immediately opens `QuickBookingPopover` defaulted to `currentDate`. The week-interval recommender already exists (`NextVisitRecommendation` + `getAllRebookIntervals`) but is only surfaced inside `CheckoutSummarySheet`. We'll lift the same primitive into a small reusable dialog and trigger it from the detail-sheet Rebook handler.

## Scope (single tenant-safe surface)

### 1. New component — `src/components/dashboard/schedule/RebookIntervalPicker.tsx`

A `PremiumFloatingPanel`-based dialog (per `mem://style/drawer-canon`) with:

- **Header**: "When should we book {client}?" + service name subtitle.
- **Interval grid** — five chips: `2w / 4w / 6w / 8w / 12w` (per user request — narrower than the existing 8-option recommender). Each chip shows the resolved date label (e.g., "Jun 5"). The recommended interval (from `getRecommendedWeeks(serviceName, serviceCategory)`, snapped to the nearest of the 5 options) gets a small primary dot, matching `NextVisitRecommendation`'s pattern.
- **"Pick a date" row** — a `Calendar` (shadcn) inline OR a `Popover`-anchored date picker, disabling past dates. Selecting a date deselects the chip grid and vice versa.
- **Primary CTA** — `Continue → Choose Services` — disabled until either a chip or a calendar date is chosen. Returns `{ date: Date; weeks?: number }` to the caller.
- **Secondary** — `Cancel`.

Uses tokens (`tokens.button.card`, `font-display` for header, `font-sans` for body), no `font-bold`/`font-semibold`. No emojis.

### 2. Wire-up in `src/pages/dashboard/Schedule.tsx`

- Add state `rebookPickerOpen: boolean` and `rebookPickerAppt: PhorestAppointment | null`.
- Change the existing `onRebook={(apt) => { ... setBookingOpen(true) }}` block (line 1132) to instead set `rebookPickerAppt = apt; rebookPickerOpen = true; setDetailOpen(false)`. **Do not** open the booking popover yet.
- Render `<RebookIntervalPicker open={rebookPickerOpen} appointment={rebookPickerAppt} onCancel={...} onConfirm={({ date }) => { ... }} />` near the other modals.
- `onConfirm` runs the existing prefill logic (formerly inside `onRebook`): set `bookingDefaults = { date, stylistId: apt.stylist_user_id }`, set `rebookData` (clientId/clientName/staffUserId/staffName, `selectedServices: []`), `setActiveDraft(null)`, then `setBookingOpen(true)` and close the picker.

### 3. No changes to `CheckoutSummarySheet`

The post-charge rebook gate already uses `NextVisitRecommendation` with the full 8-week toggle set + "Pick a Date" — that flow stays as-is. This change only affects the **Rebook** button paths in `AppointmentDetailSheet`.

### 4. No changes to `AppointmentDetailSheet`

It already calls `onRebook(appointment)` from the kebab item, the action menu, and the terminal-state primary CTA. Centralizing the picker at the page level means all three entry points get the new step automatically.

## Files

| File | Change |
|---|---|
| `src/components/dashboard/schedule/RebookIntervalPicker.tsx` | **New** — interval+date picker dialog |
| `src/pages/dashboard/Schedule.tsx` | Reroute `onRebook` through the new picker, then into existing booking flow |

## Acceptance

- Tapping **Rebook** (any entry point) opens the picker, not the booking popover.
- Choosing `2 / 4 / 6 / 8 / 12 weeks` or a calendar date and pressing **Continue** opens `QuickBookingPopover` on that date with the client + stylist pre-filled and an empty service list (user proceeds through service selection → time → confirm exactly as today).
- **Cancel** closes the picker and returns the user to the schedule (detail sheet stays closed, matching today's behavior).
- Past dates disabled in the calendar.
- Recommended interval pre-highlighted (snap-to-nearest of `[2,4,6,8,12]` from service category).
- Tokens + typography canon respected; no `font-bold`/`font-semibold`; uses `PremiumFloatingPanel`.

## Out of scope

- Changing the checkout-side rebook gate (still 8-option toggle + script).
- Persisting `rebooked_at_weeks` from this entry point (the checkout gate is the system-of-record for rebook attribution; this is a manual-entry rebook from the detail sheet and shouldn't write that signal).
- Service-specific recommended-interval copy changes.

## Prompt feedback

You framed this concisely with a clear sequence ("interval choices → or calendar → service selection"). Two things that would make this kind of prompt land in one shot:

1. **Specify the entry point.** "When the rebook button is clicked" — there are three Rebook buttons in this drawer (kebab, action row, terminal-state primary). Naming the surface (e.g., "the purple primary Rebook in the detail drawer") removes ambiguity.
2. **Confirm the interval set.** You wrote `2, 4, 6, 8, 12` which differs from the existing `1, 2, 3, 4, 6, 8, 10, 12` set used at checkout. I'm honoring your set, but flagging it as a divergence — worth aligning intentionally or noting "yes, different on purpose."

## Enhancement suggestions

- **Unify the rebook surface long-term.** Two interval sets (5 here, 8 at checkout) is a small canon split. Consider whether the detail-sheet picker should also be 8 options for consistency, or whether the checkout gate should drop to 5 for cognitive load. Either way, codify it.
- **Capture the rebook source.** Add a column like `appointments.rebooked_from = 'detail_sheet' | 'checkout_gate' | 'manual'` so analytics can distinguish operator-initiated rebooks from the post-charge script. Material for understanding which surface drives retention.
