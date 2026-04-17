

## Diagnosis

Both cards in screenshot use `rounded-xl` (12px). User wants tighter corners — closer to `rounded-lg` (8px) which reads as more refined/executive at this card size.

Per UI Canon, `rounded-xl` is the bento standard for primary containers, but these are **inline info cards inside a sheet** (secondary surfaces), so dropping a tier is consistent with the platform-bento radius doctrine: child cards should be 4–8px smaller than parents.

## Fix — Wave 22.30: Tighten hospitality stack radius

One file, two class swaps.

### Change
- `HospitalityBlock.tsx` collapsed CTA: `rounded-xl` → `rounded-lg`
- `AppointmentDetailSheet.tsx` Notes from Booking Assistant block: `rounded-xl` → `rounded-lg`

Both move from 12px → 8px. Padding stays at `px-4 py-3` (already matched in Wave 22.29).

## Files
- `src/components/dashboard/clients/HospitalityBlock.tsx`
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

## Acceptance
1. Both cards share `rounded-lg` (tighter, less pill-like)
2. Spacing/padding from Wave 22.29 unchanged
3. No regression on expanded `HospitalityBlock` (which uses child component radii, not affected)

## Note on Visual Edits
Tiny visual tweaks like radius/color/text on static elements can be done **free** via the Visual Edits tool (pencil icon, bottom-left of chat) — faster than an AI round-trip for one-class changes.

