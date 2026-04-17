

## Prompt review

Sharp UX call — "POS" is internal jargon (we use it deliberately for hardware per the Point of Sale Identity memory), but for *content surfaced to stylists*, the source matters less than the meaning: "this is what the booker captured at the time the appointment was made." Sharper next time: tell me whether to update *all* surfaces of this label or just the Details tab card — I'll plan for **all surfaces** since label drift between Details and Notes tabs would be worse than the original problem.

## Diagnosis

Need to find every render of "POS Booking Notes" string.

Known sites from prior waves:
- `AppointmentDetailSheet.tsx` Details tab card (Wave 22.20, just shipped)
- `AppointmentDetailSheet.tsx` Notes tab block (L2392 area)

Will grep to confirm no others before planning the swap.
