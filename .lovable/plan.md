

## Rename "Services" → "Formulations", Remove Bottom Bar, Add Edit Services Button

### Changes

**1. `src/components/dock/appointment/DockAppointmentDetail.tsx`**
- Rename tab label from `'Services'` to `'Formulations'` in the `TABS` array
- Remove the small pencil icon button from the header subtitle
- Add a prominent "Edit Services" button below the subtitle — styled as a tappable pill/chip with a `Pencil` icon, using a visible border and padding (e.g. `px-3 py-1.5 rounded-lg border border-violet-500/40 text-violet-400 text-xs font-medium`) so it's easy to spot and tap
- Keep the `DockEditServicesSheet` wiring as-is, just triggered from the new button

**2. `src/components/dock/appointment/DockServicesTab.tsx`**
- Remove the entire `ContextualActionBar` component (lines ~530–590)
- Remove the `ContextualActionBar` render block (lines ~431–458)
- Remove the `getSessionActionState` function (lines ~510–528) since nothing uses it anymore
- The formula history floating button, inline Add Bowl cards, and bowl tap-to-open behavior remain — they already cover all the actions the bottom bar was duplicating

### Result
- Tab reads "Formulations" instead of "Services"
- No redundant bottom action bar cluttering the view
- Edit Services is a clear, tappable button in the header area instead of a tiny pencil icon

