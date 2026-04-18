

## Diagnosis

Current timing in `AnimatedBlurredAmount` and `AnimatedNumber`:
- Exit (fade out): 250ms opacity / 300ms y
- Enter (fade in): 250ms opacity / 300ms y

With `mode="wait"`, total swap = ~500ms but each individual fade is only 250ms — fast enough that on a mid-sized number it reads as a snap, not a fade. The `y: 4 → 0` motion also distracts from the opacity, making it feel jumpy rather than dissolved.

## Fix

Slow the crossfade meaningfully and drop the y-translation on value changes so the eye reads pure opacity:

- **First reveal (mount)**: opacity 0 → 1 over **500ms**, ease-out. Keep tiny `y: 4 → 0` for first-paint polish.
- **Value change exit**: opacity 1 → 0 over **400ms**, ease-out. No y motion.
- **Value change enter**: opacity 0 → 1 over **500ms**, ease-out, after exit completes (`mode="wait"`). No y motion.
- **Total swap**: ~900ms — slow enough to clearly read as a dissolve, fast enough to not feel sluggish on filter changes.

Easing stays `[0.16, 1, 0.3, 1]` (smooth ease-out).

Apply identical timing to both primitives so the whole dashboard moves in unison.

## Out of scope
- Counter/rAF logic (already removed)
- Privacy blur, auto-compact, session gate
- Other animation surfaces

## Files
- **Modify**: `src/components/ui/AnimatedBlurredAmount.tsx` — bump exit to 400ms, enter to 500ms, drop y on value-change variants (keep on first reveal only).
- **Modify**: `src/components/ui/AnimatedNumber.tsx` — same timing changes for parity.

