## Diagnosis

The status pill ("Conf" / "Unconf") on appointment cards in `src/components/dashboard/schedule/AppointmentCardContent.tsx` (lines 284 and 331) renders a tiny indicator dot using `badge.bg` from `APPOINTMENT_STATUS_BADGE`.

That `bg` token is a heavily desaturated pastel meant for **pill backgrounds**, not foreground marks:
- light: `bg-amber-100`, `bg-green-100`, `bg-purple-100`
- dark: `bg-amber-900/30`, `bg-green-900/30`, `bg-purple-900/30`

Against the pill's own translucent background (`bg-white/55 dark:bg-black/25`), a 3×3px swatch of `amber-900/30` collapses into the noise — exactly what the screenshot shows. The dot is technically rendered, just optically dead.

## Fix (single, minimal)

Switch the dot's color from `badge.bg` → `bg-current`. `currentColor` inherits the pill's already-set `badge.text` (e.g. `text-amber-300` / `text-green-300`), which is the same visible color as the "Conf"/"Unconf" label. The dot will read as a small confident leading mark on the same hue/contrast as the text — no new tokens, no token mutations, no impact on the pill background.

Apply to both occurrences:

```tsx
// Before
<span className={cn('h-[3px] w-[3px] rounded-full', badge.bg)} />

// After
<span className={cn('h-[3px] w-[3px] rounded-full bg-current')} />
```

Optionally bump to `h-[5px] w-[5px]` for slightly stronger presence at typical card density — happy to do that as part of the same change if you want a touch more weight.

## Why not modify `APPOINTMENT_STATUS_BADGE`

The `bg` token is correctly authored for its primary use (pill backgrounds across `AppointmentPreview`, `AgendaView`, `ScheduleLegend`, etc.). Adding a separate `dot` field would be the principled long-term move, but is overkill for a single-component cosmetic miss — `bg-current` is the canon-clean shortcut and correctly couples the dot to whatever the label color resolves to.

## Files touched
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` (2 lines: 284, 331)

## Prompt feedback

Strong prompt — you pointed at the symptom ("dots are too dark"), the surface ("status badges in the top right of the cards"), and gave a screenshot. That's the right shape: visual artifact + location + screenshot. One refinement that would sharpen future visual prompts:

> "On the day-view appointment cards, the leading dot inside the status pill (Conf/Unconf) is invisible — it's using the pill background color instead of the label color. Match it to the label text."

The added precision ("inside the status pill" + "should match the label color") shortcuts the diagnosis step entirely. You're already 90% of the way there — calling out the *expected* color relationship, not just that it's wrong, lets me skip straight to the patch.

## Further enhancement suggestions

1. **Promote a `dot` token in `APPOINTMENT_STATUS_BADGE`.** Right now `bg-current` works because the dot is inside a colored-text element, but it silently couples dot styling to text color. If a future variant ever needs a different dot color (e.g. a saturated dot inside a neutral pill for a "warning" treatment), you'd want `APPOINTMENT_STATUS_BADGE[k].dot` as a first-class field. Cheap to add; pays off the next time you reach for it.
2. **Audit other 3px dots for the same pattern.** I found these two are the only `badge.bg`-driven dots in the codebase, but a `rg "rounded-full.*badge\.bg"` lint check in CI would prevent regression — same anti-pattern is easy to copy-paste into a new view.
3. **Contrast smoke test for status pills.** A tiny Vitest snapshot rendering each `APPOINTMENT_STATUS_BADGE` entry over both light and dark card backdrops, asserting min relative luminance delta on the dot, would catch this class of issue automatically. Optional, but cheap insurance for a surface operators stare at all day.