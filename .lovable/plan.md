

## Restyle Swipe Action Buttons — Circles with External Labels

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx`

### Changes

1. **Icon buttons → full circles:** Change from `w-14 h-14 rounded-xl` to `w-11 h-11 rounded-full`
2. **Labels move outside/below:** Remove `<span>` from inside the button. Wrap each action in a `<div className="flex flex-col items-center gap-1">` with the circle button on top and label below as a separate element.
3. **Relabel:** "Done" → "Finish Appt", "Client" → "Client Info"
4. **Label styling:** `text-[8px] tracking-wide uppercase font-display` with matching tint color (`text-emerald-400` / `text-violet-400`)
5. **Tray width adjustment:** Increase to ~170px (two circles + labels need horizontal room since "Finish Appt" is wider). Update `OPEN_OFFSET` to `-170` and terminal offset to `-78`.

