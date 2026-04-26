## Goal

Eliminate the "shape change" you're seeing on focus and standardize every input/select/textarea on a single calm rectangular shape across the entire platform. Focus becomes a **fill-tone shift only** (subtly lighter or darker depending on theme/mode) — no radius change, no ring, no border-color jump, no pill→rectangle hop.

## Root cause confirmed

Three different radii are in play right now:

| Primitive | Current | Result |
|---|---|---|
| `Input` (`src/components/ui/input.tsx`) | `rounded-full` (pill) | email field in your screenshot |
| `Textarea` (`src/components/ui/textarea.tsx`) | `rounded-md` | mismatched |
| `SelectTrigger` (`src/components/ui/select.tsx`) | `rounded-full` (pill) | mismatched with textarea |
| `PlatformInput` | `rounded-xl` | mismatched with org `Input` |
| Login page password field | inherits `rounded-full` but `pr-10` + autofill UA styles visually re-square it on focus | the awkward shape jump in your screenshot |

Plus, focus styles are inconsistent: `focus-visible:border-foreground/30` (Input/Textarea/Select) flips border color on focus → reads as a "shape change" alongside the autofill background.

## Plan — 4 waves

### Wave 1 — Establish the canonical input shape token

Add a single source of truth in `src/lib/design-tokens.ts`:

```ts
input: {
  // Rectangular, calm. Same radius as PlatformInput already uses.
  shape: 'rounded-xl',
  // Focus = fill-tone shift only. No ring, no border color jump, no shape change.
  focus: 'focus:outline-none focus-visible:outline-none focus:bg-muted/60 focus-visible:bg-muted/60 dark:focus:bg-white/[0.06] dark:focus-visible:bg-white/[0.06]',
  // Idle fill — slightly recessed from background so focus tone has room to read
  fill: 'bg-muted/30 dark:bg-white/[0.03]',
  border: 'border border-input',
  transition: 'transition-colors duration-150',
}
```

Rationale: focus signal becomes a **brightness delta against the surrounding card**, which works on both light and dark themes and on every tenant palette (Zura purple, Cream, Rose, Sage, Ocean, Ember, Noir) without per-theme overrides. The border stays put; the radius stays put.

### Wave 2 — Update the 3 org primitives

- **`src/components/ui/input.tsx`** — replace `rounded-full` → `rounded-xl`; remove `focus-visible:border-foreground/30`; add fill-tone focus.
- **`src/components/ui/textarea.tsx`** — `rounded-md` → `rounded-xl`; same focus update.
- **`src/components/ui/select.tsx`** — `SelectTrigger` `rounded-full` → `rounded-xl`; same focus update. Leave `SelectItem` (line 110) `rounded-full` as-is — that's a menu item hover pill, unrelated to input shape.

This single change propagates to all **360 Input call sites** and **275 Select call sites** automatically.

### Wave 3 — Update the platform-side primitives for parity

- **`src/components/platform/ui/PlatformInput.tsx`** — already `rounded-xl` ✅. Update focus rule: drop the border-color shift on focus (line 35: `focus:border-[hsl(var(--platform-primary)/0.5)]`) and replace with a `--platform-input-focus` fill-tone shift (variable already exists in the codebase, used today as `bg-[hsl(var(--platform-input-focus)/0.5)]` on hover — we'll use `1.0` opacity on focus so focus reads as deeper than hover).
- **`src/components/platform/ui/PlatformTextarea.tsx`** — same focus update; confirm `rounded-xl`.
- **`src/components/platform/ui/PlatformSelect.tsx`** — same focus update; confirm `rounded-xl`.

### Wave 4 — Fix the login-page password field specifically

The screenshot you uploaded is `OrgBrandedLogin.tsx` lines 478–510. Both fields use the same `<Input>`, so once Wave 2 lands, both render as identical `rounded-xl` containers. Two extra touches there:

1. The custom `className` on lines 485 and 500 currently passes `focus-visible:ring-violet-500` — that's the **violet ring** that visually re-shapes the password box on focus when autofill is active. Replace with the same fill-tone focus pattern (`focus:bg-white/[0.08]`) so the email and password fields shift identically on focus.
2. Add `autofill:bg-white/[0.04]` styling via the `-webkit-autofill` shadow trick already used elsewhere in the project (will check `src/index.css` for the existing rule and extend it; if absent, add a single global rule covering `input:-webkit-autofill`).

## What stays unchanged (intentional)

- **Buttons**: `rounded-full` pill style on buttons is canonical (page header CTAs, hero CTAs). Untouched.
- **Toggles, chips, avatars, navigation pills, BootLuxeLoader, carousel dots**: all `rounded-full` on purpose. Untouched.
- **Bento card containers**: `rounded-xl` already. Inputs now match cards visually instead of fighting them.
- **`SelectItem` rows**: `rounded-full` hover pill stays — that's menu UX, not input shape.

## Files to edit

| File | Change |
|---|---|
| `src/lib/design-tokens.ts` | + new `input` token group |
| `src/components/ui/input.tsx` | `rounded-full` → `rounded-xl`, focus = fill-tone |
| `src/components/ui/textarea.tsx` | `rounded-md` → `rounded-xl`, focus = fill-tone |
| `src/components/ui/select.tsx` | `SelectTrigger` `rounded-full` → `rounded-xl`, focus = fill-tone |
| `src/components/platform/ui/PlatformInput.tsx` | Focus rule swap (no border-color jump) |
| `src/components/platform/ui/PlatformTextarea.tsx` | Focus rule swap |
| `src/components/platform/ui/PlatformSelect.tsx` | Focus rule swap |
| `src/pages/OrgBrandedLogin.tsx` | Drop `focus-visible:ring-violet-500` from email + password (lines 485, 500) |
| `src/index.css` (if needed) | `-webkit-autofill` shadow override so autofill doesn't re-paint a square white background |

## Verification after ship

1. `/login` and `/:orgSlug/login` — tab from email → password → both stay rectangular `rounded-xl`, focus reads as a calm fill darken.
2. `/dashboard/admin/settings` — every form input/select/textarea matches the surrounding bento cards (same radius family).
3. `/dashboard/platform/*` — Platform pages keep their `--platform-input` palette, focus is fill-tone only.
4. All 7 themes (Zura, Cream, Rose, Sage, Ocean, Ember, Noir) — focus tone reads as a delta, not a color change.

## Prompt-craft note (per your instructions)

Strong prompt — you described the *symptom* ("shape changes"), the *desired behavior* ("keep same shape, fill lighter/darker"), and the *scope* ("entire platform"). That's the trifecta.

One refinement that would have shortened the back-and-forth: a one-line success criterion, e.g. *"Acceptance: tabbing through any form on any page produces zero geometry change — only fill-tone shifts."* That kind of crisp acceptance line lets me write the verification step before I touch any code, and lets you reject a fix that's technically correct but visually still feels off. I'll add it to my mental checklist when scoping similar global UI canon changes.

## Enhancement suggestions for after this lands

1. **Codify the rule.** Add a Stylelint or ESLint rule banning `rounded-full` on raw `<input>`, `<textarea>`, and `SelectTrigger` className overrides — same pattern as the platform-primitive isolation canon. Prevents future drift.
2. **Memory entry.** Save `mem://style/input-shape-canon.md` capturing: rectangular `rounded-xl`, focus = fill-tone only, no border-color shift, no ring on inputs. Pairs naturally with the existing Design Token canon.
3. **Audit harness extension.** The container-aware spatial audit at `/dashboard/_internal/spatial-audit` could grow a "form chrome" tab that flags any input/select/textarea whose computed `border-radius` differs from the canon — catches one-off `className="rounded-md"` overrides at review time.
