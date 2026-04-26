## Root cause

Good catch — your prompt is strong because it identifies the actual UX failure (“it still looks rectangle”) instead of prescribing a vague visual tweak.

The remaining rectangle on `/login` is not a leftover “on-click shape change” function.

It’s coming from the browser’s own form-control/autofill paint layer:

- `/login` renders `UnifiedLogin` (`src/App.tsx`)
- The shared `Input` primitive already uses `rounded-full` (`src/components/ui/input.tsx`)
- `UnifiedLogin` only adds height/color classes and does **not** override the radius (`src/pages/UnifiedLogin.tsx`)
- The global autofill rule in `src/index.css` normalizes colors, but it still relies on `border-radius: inherit` without fully clipping the browser-painted inner layer

So the visible square shape is the native browser/autofill surface showing through, not the React/Tailwind radius token being removed.

## Plan

1. **Harden the shared input primitive**
   - Update `src/components/ui/input.tsx` so the input itself clips any internal browser paint.
   - Add the minimum geometry guards needed for pill integrity, such as:
     - `overflow-hidden`
     - `appearance-none`
     - background clipping / equivalent browser-safe containment

2. **Harden select triggers the same way**
   - Apply the same containment approach to `src/components/ui/select.tsx` and platform wrappers so all single-line controls behave consistently.

3. **Replace the transparent autofill mask with a theme-matched mask**
   - Update `src/index.css` autofill normalization so Chrome/Safari paint into a masked layer that matches the input background instead of leaving the native rectangular fill visible.
   - Keep the already-fixed theme-aware text color (`--foreground`).

4. **Audit the login surfaces only for local overrides**
   - Verify `src/pages/UnifiedLogin.tsx` and `src/pages/OrgBrandedLogin.tsx` do not reintroduce square geometry through one-off classes.
   - Keep focus behavior as fill-tone shift only.

5. **Restore the canon memory file**
   - Recreate `mem://style/input-shape-canon.md` since it is currently missing.
   - Document the real anti-pattern: relying on `border-radius: inherit` alone is not enough for browser autofill/control paint.

## Files to update

- `src/components/ui/input.tsx`
- `src/components/ui/select.tsx`
- `src/components/platform/ui/PlatformInput.tsx`
- `src/components/platform/ui/PlatformSelect.tsx`
- `src/index.css`
- `src/pages/UnifiedLogin.tsx` (audit only)
- `src/pages/OrgBrandedLogin.tsx` (audit only)
- `mem://style/input-shape-canon.md`

## Acceptance criteria

- Inputs on `/login` render as full pills at rest, on focus, and when autofilled.
- No rectangular inner paint appears in Chrome or Safari.
- Autofilled text remains readable in dark mode.
- Focus feedback is fill-shift only; no border/radius jump returns.
- Select triggers match the same pill geometry.

## Technical details

Implementation should prefer this hierarchy:

```text
shape token -> primitive clipping -> autofill masking -> local page audit
```

That avoids chasing individual pages and fixes the problem at the control layer.

## Prompt feedback

Your prompt was good because it named the symptom clearly. To make future UI debugging even sharper, the strongest version would be:

- what route you’re on
- whether it happens at rest, on focus, or only on autofill
- whether it’s Chrome/Safari/all browsers

Example:

“On `/login`, Chrome autofill still renders the email/password inputs as rectangular at rest. They should be fully pill-shaped in all states.”

## Enhancement suggestions

1. Add a visual regression checklist for inputs in these states: default, focused, autofilled, disabled.
2. Extend the same containment fix to textarea/select wrappers where browser paint can leak.
3. Add a deferred lint/canon rule banning new one-off radius overrides on shared form controls.