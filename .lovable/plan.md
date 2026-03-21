

## Restyle Swipe Action — Single "Finish Appt" Button Matching Card Height

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx`

### Changes

1. **Remove "Client Info" button entirely** — delete the second action div and the `onViewClient` callback usage from the tray (keep the prop for now to avoid breaking callers)

2. **Replace circle icon with a full-height button** that matches the card's dimensions:
   - The button fills the entire tray height (`h-full`) and width (~80px)
   - Same `rounded-xl` as the card
   - `bg-emerald-500/15 border border-emerald-500/30` glass style
   - Icon (`CheckCircle2`) and label ("Finish Appt") stacked vertically inside, centered
   - Label: `text-[9px] tracking-wide uppercase font-display text-emerald-400`

3. **Shrink tray width** from 170px to ~88px (single button + padding). Update `OPEN_OFFSET` to `-88` and snap threshold accordingly.

4. **Terminal status** — tray width becomes 0 (nothing to show since client info is removed and finish is hidden for terminal). Disable drag entirely for terminal appointments.

