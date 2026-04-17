

## Diagnosis

In `AppointmentDetailSheet.tsx` (line 1904), the Stylist row renders a static `<Badge variant="outline">Booked</Badge>` next to the stylist name. It's hardcoded — it does NOT reflect the appointment status (the same badge shows whether the appointment is Booked, Confirmed, Checked In, or Completed). It conflicts with the actual status badge shown in the sheet header. Pure noise.

The `Preferred` badge alongside it is meaningful (flags preferred-stylist match) — keep it.

## Fix — Wave 22.31: Remove redundant "Booked" badge

One line removal.

### Change
- `AppointmentDetailSheet.tsx` line 1904: delete the `<Badge variant="outline" className="text-[10px]">Booked</Badge>` line.

## Files
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

## Acceptance
1. Stylist row shows: avatar + name + (optional) Preferred badge — no "Booked" pill
2. Preferred-mismatch logic untouched
3. No regression on appointment status badge in the sheet header

## Note on Visual Edits
For one-element removals like this, the **Visual Edits tool** (pencil icon, bottom-left of chat) lets you click the badge and delete it directly — free and instant. Worth knowing for the next micro-tweak.

