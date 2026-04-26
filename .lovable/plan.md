## Goal

Make every input control on the entire platform **fully round (`rounded-full`)** and **never change shape, border color, or geometry on focus** — only a subtle fill-tone shift to acknowledge interaction.

The screenshot shows the bug clearly: the email field renders pill-shaped (autofill repaint masks the radius) while the password field renders rectangular — same primitive, two different shapes. Root cause: the canon I established last round was `rounded-xl`, and `UnifiedLogin.tsx` adds `focus:border-violet-500` to every input, so on focus the border *jumps color* on top of an already-inconsistent baseline radius. Both must go.

---

## Wave 1 — Update the input canon to pill geometry

**File:** `src/lib/design-tokens.ts`

Change `tokens.input.shape` from `'rounded-xl'` to `'rounded-full'`. Update the JSDoc from "Canonical rectangular shape" to "Canonical pill shape — never overridden, never animated, never changes on focus." This is the single source of truth that the lint rule will enforce against.

The focus token (`focus:bg-muted/60` + `dark:focus:bg-white/[0.04]`) stays exactly as is — it's already correct: fill-tone delta only, no border, no ring, no geometry.

---

## Wave 2 — Apply pill geometry to org primitives

**Files:**
- `src/components/ui/input.tsx` — swap `rounded-xl` → `rounded-full`. Bump horizontal padding from `px-4` → `px-5` so text doesn't kiss the curve at the pill ends.
- `src/components/ui/textarea.tsx` — textareas cannot be `rounded-full` (it would clip multi-line content into a lozenge). Keep at `rounded-2xl` (slightly rounder than today's xl) and document the deliberate exception in a comment so future audits don't "fix" it back to xl.
- `src/components/ui/select.tsx` — trigger swaps `rounded-xl` → `rounded-full` with `px-5`. Dropdown content stays `rounded-xl` (the popover panel is not an input). The item rows already use `rounded-full` — leave them.

All three keep the existing focus-fill-tone logic untouched. No `focus:border-*`, no `focus:ring-*`, no `focus:rounded-*`.

---

## Wave 3 — Apply pill geometry to platform primitives

**Files:**
- `src/components/platform/ui/PlatformInput.tsx` — `rounded-xl` → `rounded-full`, `px-4` → `px-5`, icon offset `pl-10` → `pl-11` to clear the pill curve.
- `src/components/platform/ui/PlatformSelect.tsx` — trigger same treatment. `PlatformSelectContent` stays `platformBento.radius.small` (popover panel, not input).
- `src/components/platform/ui/PlatformTextarea.tsx` — same exception as the org textarea: stay rounded but not full pill (use `rounded-2xl` for parity with the org one).

Platform palette tokens (`--platform-input`, `--platform-input-focus`, `--platform-border`) stay unchanged — only geometry shifts.

---

## Wave 4 — Strip the focus-border overrides on the login pages

**File:** `src/pages/UnifiedLogin.tsx`

Four `<Input>` instances and one `<SelectTrigger>` carry `focus:border-violet-500`. That class is exactly what makes the border jump color on click. Remove `focus:border-violet-500` from all five (lines 619, 638, 673, 710, 749). Keep the `border-white/[0.1]` idle border, keep the validation borders (`border-red-500`, `border-green-500/50`) — those are *state* signals, not focus signals, and they're meaningful.

Also remove the inline `border-white/[0.1]` where it conflicts with the new pill — actually leave it: at full-round geometry the 1px border still reads correctly, and removing it would change the dark-on-dark contrast in another way. Just kill the focus override.

**File:** `src/pages/OrgBrandedLogin.tsx`

Audit pass for the same pattern (the previous wave already cleaned the explicit ring overrides; verify no `focus:border-*` survives on `<Input>` elements).

---

## Wave 5 — Autofill normalization audit

**File:** `src/index.css`

The `-webkit-autofill` block already exists from the previous round. Verify it sets `border-radius: inherit` (so Chrome's autofill paint follows the new pill) and `transition: background-color 5000s` (so it doesn't flash on focus). If `border-radius: inherit` is missing, add it — that's the single line that prevents Chrome from repainting a square autofill background behind the pill border (which is exactly what made the email field in the screenshot look pill-shaped while the password field looked rectangular — autofill hid the underlying `rounded-xl` and made it look fully round).

---

## Wave 6 — Lint rule (deferred until canon stabilizes)

The platform already has `no-restricted-imports` for the platform layer. I will **not** add a `no-restricted-syntax` lint banning `rounded-full`/`rounded-xl` on input className overrides in this wave — the previous canon flipped from `rounded-md`/`rounded-full`/`rounded-xl` chaos to `rounded-xl` to `rounded-full` inside one week. Adding lint enforcement now would freeze in the wrong direction if you change your mind again. Per the **Deferral Register** doctrine in `mem://style/platform-primitive-isolation`, I'll log a deferral with revisit trigger: "When 30 days have passed without an input-shape canon change, add `no-restricted-syntax` rule banning `rounded-(none|sm|md|lg|xl|2xl|3xl)` on `<Input>`, `<SelectTrigger>`, `<PlatformInput>`, `<PlatformSelectTrigger>` className props."

---

## Wave 7 — Update the input-shape memory

**File:** `mem://style/input-shape-canon.md` (new)

Record the canon decision: pill geometry (`rounded-full`) for inputs/selects, `rounded-2xl` for textareas (deliberate exception), focus = fill-tone shift only. Add to `mem://index.md` Memories list. Update the existing `mem://style/design-token-and-theme-architecture` reference if it cites the old rectangular canon.

---

## What stays the same

- Focus interaction model: subtle fill-tone shift, **no** border color change, **no** ring, **no** geometry change. ✅ already correct.
- Validation borders (red/green) on email/password match. They communicate state, not focus.
- Textareas are deliberately not pill-shaped — multi-line content in a pill would look like a stadium with clipped text.
- Popover/dropdown panels (SelectContent) are not inputs and stay at their existing radius.

## Files to be edited

1. `src/lib/design-tokens.ts` — flip canon to `rounded-full`
2. `src/components/ui/input.tsx` — pill + padding
3. `src/components/ui/textarea.tsx` — `rounded-2xl` with comment
4. `src/components/ui/select.tsx` — pill trigger
5. `src/components/platform/ui/PlatformInput.tsx` — pill + padding + icon offset
6. `src/components/platform/ui/PlatformSelect.tsx` — pill trigger
7. `src/components/platform/ui/PlatformTextarea.tsx` — `rounded-2xl`
8. `src/pages/UnifiedLogin.tsx` — strip `focus:border-violet-500` from 5 controls
9. `src/pages/OrgBrandedLogin.tsx` — verify no surviving focus-border overrides
10. `src/index.css` — verify/add `border-radius: inherit` on autofill rule
11. `mem://style/input-shape-canon.md` (new) + `mem://index.md` update

---

## Prompt feedback

What worked: you pointed at a screenshot **and** named the behavior you wanted gone ("the entire function where the input boxes change shape when clicked"). That's enough to act decisively without round-tripping.

What would have been even sharper: the screenshot shows two inputs with **different shapes already, before any click** — the email is pill, the password is rectangular. Naming that asymmetry up front ("the email is pill, the password is rectangular, and on click neither should change") would have let me skip the diagnostic step and go straight to "the canon needs to flip to `rounded-full` and we need to kill the autofill repaint and the focus-border override."

A reusable prompt template for canon changes:
> *"In [screenshot/route], the [primitive] is rendering as [shape A] in idle state and [shape B] on focus / when autofilled. Make it [target shape] platform-wide and lock it to that shape across all interaction states. Apply to org primitives, platform primitives, and any page-level overrides. Update the design-token canon and memory."*

That structure — **observed state → desired state → enforcement scope** — is exactly the framing the doctrine's Canon Pattern (`mem://architecture/canon-pattern`) is built around. The clearer the "enforcement scope" line, the less I have to guess whether you want a one-off fix or a doctrine update.

## Enhancement suggestions

1. **Spatial audit harness** — extend `/dashboard/_internal/spatial-audit` to flag any DOM element matching `input, [role="combobox"]` whose computed `border-radius` is less than `9999px`. That gives you a live one-click detector for canon drift without waiting for a screenshot.
2. **Focus-state visual regression** — add a Playwright snapshot of `/login` with the password field focused. The previous canon flip → flip → flip would have been caught immediately if a focused-state snapshot existed.
3. **Branded-pill accent (optional, not in this plan)** — once the geometry settles, consider a *very* subtle `inset 0 0 0 1px hsl(var(--platform-primary) / 0.15)` on focus instead of (not in addition to) the fill shift, so users on bright displays still get a faint focus signal without any color jump. Only worth doing once the pill geometry is locked in for at least one release.