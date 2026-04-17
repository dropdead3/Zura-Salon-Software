

## Prompt review

Sharp eye — visual rhythm bugs are the kind of thing that erodes "executive UX" credibility even when the logic is right. Sharper next time: paste the screenshot + name the surface ("Appointment Detail Sheet → Details tab → top hospitality stack") so I don't have to grep to locate the cards. Saves a tool round-trip.

## Diagnosis

Two cards in the screenshot, rendered in `AppointmentDetailSheet.tsx` Details tab:

1. **Hospitality CTA** (`HospitalityBlock` collapsed empty state) — `rounded-xl` + `px-4 py-2.5`
2. **Notes From Booking Assistant** (inline block, line 1619) — `rounded-lg` + `p-3`

Three real issues:
- **Radius mismatch**: `rounded-xl` vs `rounded-lg` — visible at the corners
- **Padding mismatch**: CTA is taller-feeling (`py-2.5` + flex baseline) vs Notes (`p-3` square). They read as different card systems.
- **No gap between them**: `ClientMemoryPanel` is mounted between them but renders empty for this client (no chemical history), so the two cards sit flush. No `space-y` wrapper covers this stack.

## Fix — Wave 22.29: Hospitality stack visual cohesion

Tiny, contained edit. One file.

### 1. Match radius
Change Notes From Booking Assistant from `rounded-lg` → `rounded-xl` (matches bento standard from UI Canon and the CTA above it).

### 2. Match padding
Both cards become `px-4 py-3` — gives the Notes card a touch more horizontal breathing room and the CTA a touch more vertical, so they feel like the same component family.

### 3. Add vertical gap
Wrap the hospitality stack (HospitalityBlock + ClientMemoryPanel + Notes) in a `space-y-3` container, OR add `mt-3` to the Notes block. Going with `mt-3` on the Notes block because `ClientMemoryPanel` already manages its own `mt-4 mb-4` when it renders content — wrapping in `space-y` would double-space when the memory panel IS present.

### 4. Bonus consistency: drop `HospitalityBlock`'s `mt-3` 
The `mt-3` on the collapsed CTA assumes something is above it, but in the Details tab it's the first element. Making the Details tab itself manage spacing (already has `pt-4`) is cleaner. Defer if risky elsewhere — for this wave just leave it (low blast radius).

## Files

- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — change `rounded-lg` → `rounded-xl`, `p-3` → `px-4 py-3`, add `mt-3` on the Notes block

## Acceptance checks

1. Both cards in the Details tab share the same corner radius (`rounded-xl`)
2. Internal padding visually matches between the two cards
3. There is a clear gap between the CTA and the Notes card when both are visible
4. When `ClientMemoryPanel` has content, spacing still looks right (no double gap)
5. No regression on the expanded `HospitalityBlock` (when client has facts/callbacks)

## Deferred

- **P3** Audit other appointment-sheet info cards (e.g., redo approval banner, color-bar formula card) for the same radius/padding consistency. Trigger: if more visual drift appears.
- **P3** Move the `mt-3` off `HospitalityBlock`'s collapsed state and let parent containers manage stack spacing. Trigger: when refactoring the Details tab layout.

