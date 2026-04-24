

## Prompt feedback
Strong observation prompt — you named the surface, the symptom, and the doctrine being violated ("no cross pollinations or leaks from organizations") in one sentence. Sharper next time: name the specific UI elements that look wrong (e.g. "the checkbox borders, the master switch, and the 'No card' underline are showing my org's pink"). That removes the "is this the violet platform accent or the org's brand" ambiguity and lets the fix go straight to the leaking primitive instead of the page.

## What's broken

This is a Theme Governance regression with a specific shape:

- The platform admin layer (`/platform/*`) renders inside `PlatformLayout`, which sets `--platform-*` CSS vars under a scoped `.platform-theme` class.
- `PlatformLayout` does **not** strip the org's `theme-*` class or the dark class from `<html>` on entry. Those classes were applied by `useColorTheme.applyTheme()` while the user was inside `/dashboard/*`, and they persist on `<html>` across navigation.
- That means while you're on `/platform/color-bar`, `<html>` still carries `theme-rosewood` (or whichever palette your org uses), which is still defining `--primary`, `--muted`, `--border`, etc. globally.
- Almost every component in `ColorBarEntitlementsTab` is correctly using the platform-scoped primitives (`PlatformCard`, `PlatformBadge`, `PlatformInput`, `PlatformTable`, `PlatformButton`). But two raw primitives slipped through:
  - `<Checkbox>` from `@/components/ui/checkbox` — uses `border-primary` and `data-[state=checked]:bg-primary`
  - `<Switch>` from `@/components/ui/switch` — uses `data-[state=checked]:bg-primary` and `data-[state=unchecked]:bg-muted`
- Both read `--primary` / `--muted` from the global org theme, not from `--platform-primary`. That's the pink/magenta you see on the checkboxes and the master switch trail.
- The "No card" pill underline reads `border-slate-600` directly, but the surrounding parent inherits link-style colors from the org palette in a few places — secondary visible bleed.

The architectural rule is already in place (`platform-theme isolation` canon, `mem://tech-decisions/platform-theme-isolation`). It's enforced for components that explicitly use `--platform-*`. It's silently broken for any raw shadcn primitive that reads `--primary` or `--muted`.

## The fix — three layers, each closing a different leak class

### 1) Strip org theme classes from `<html>` on platform-zone entry

Add a sibling to `useOrgThemeReset` — `usePlatformThemeIsolation()` — mounted inside `PlatformLayoutInner`. On mount and whenever the route stays in the platform zone, it:
- Removes every `theme-*` class from `documentElement.classList`
- Removes the `dark` class (platform layer manages its own light/dark via `.platform-light` / `.platform-dark` on body)
- Strips every inline non-`--platform-*` CSS var from `documentElement.style` (same logic as `clearOrgThemeVars` already in `ThemeInitializer`)

On unmount (user navigates back to `/dashboard/*`), it does nothing — `useColorTheme` will re-apply the org's theme class on its next paint. `useOrgThemeReset` is already wired in `DashboardLayout`, so the inverse direction is covered.

### 2) Create platform-scoped Checkbox + Switch and swap them in

Add two new primitives mirroring the existing `Platform*` family:
- `src/components/platform/ui/PlatformCheckbox.tsx` — same shape as `Checkbox` but reads `border-[hsl(var(--platform-primary))]` and `data-[state=checked]:bg-[hsl(var(--platform-primary))]`
- `src/components/platform/ui/PlatformSwitch.tsx` — same shape as `Switch` but reads `data-[state=checked]:bg-[hsl(var(--platform-primary))]` and `data-[state=unchecked]:bg-[hsl(var(--platform-border)/0.5)]`

Then in `ColorBarEntitlementsTab.tsx`:
- Replace the two raw imports with the platform versions
- Same JSX — the API is identical

These primitives become the canonical platform versions that all `/platform/*` surfaces should use, paralleling `PlatformCard`, `PlatformBadge`, etc.

### 3) Audit the rest of `/platform/*` for raw primitive leaks

Same regression class can hide in any platform page that imports a raw shadcn primitive that reads `--primary`, `--muted`, `--accent`, `--ring`, etc. Run a grep over `src/components/platform/**` and `src/pages/dashboard/platform/**` for direct imports from `@/components/ui/{checkbox,switch,radio-group,slider,toggle,tabs,progress}` and either swap them for `Platform*` versions (creating new ones if missing) or wrap the usage in a node that locally pins `--primary` to `--platform-primary` via inline style.

Lightweight first pass — fix the visible bleed (checkbox + switch), file a list of remaining raw imports as a follow-up audit. Don't over-rotate the codebase in one pass.

## Files involved
- New: `src/hooks/usePlatformThemeIsolation.ts` — strips org theme classes + inline vars from `<html>` while the platform layer is mounted
- `src/components/platform/layout/PlatformLayout.tsx` — mount the new hook inside `PlatformLayoutInner`
- New: `src/components/platform/ui/PlatformCheckbox.tsx` — platform-scoped checkbox
- New: `src/components/platform/ui/PlatformSwitch.tsx` — platform-scoped switch
- `src/components/platform/color-bar/ColorBarEntitlementsTab.tsx` — swap two imports

## What stays the same
- `ThemeInitializer` org-scoped read path — already correct
- `useColorTheme` apply/clear logic for org dashboard — untouched; only platform layer adds its own cleanup
- `PlatformThemeContext` and `--platform-*` token system — untouched
- All existing `Platform*` UI primitives — untouched
- Org-scoped persistence and owner gating — untouched

## QA checklist
- Sign in as a user whose org uses Rosewood → navigate to `/platform/color-bar` → checkboxes and master switch render in violet (`--platform-primary`), not pink
- Switch org-side theme to Cream Lux, Marine, Noir, Neon (each picks a distinctly different `--primary`) → re-enter platform → still violet
- Navigate `/platform → /dashboard` → org's brand re-applies cleanly
- Navigate `/dashboard → /platform → /dashboard` repeatedly → no flash, no stuck state, no leaked classes on `<html>`
- Inspect `<html>` while on `/platform/*` → no `theme-*` class, no `dark` class, no inline `--primary` / `--muted` / `--border`
- Other platform pages (Accounts, Health, Capital Control Tower) — verify no regression on existing surfaces

## Enhancement suggestion
After this lands, file two follow-ups:
1. **Lint rule**: ban direct imports of raw primitives `(checkbox|switch|radio-group|slider|toggle|progress)` inside `src/components/platform/**` and `src/pages/dashboard/platform/**`. Same shape as the Loader2 lint canon — a one-line file-pattern check that fails CI for the regression class. The current bug shipped because the rule "platform pages must use Platform-scoped primitives" only existed in human memory.
2. **Vitest smoke**: a single test that mounts `PlatformLayout` with a fake org context whose theme is Rosewood, asserts `<html>.classList.contains('theme-rosewood')` is **false** after mount, and asserts a snapshot of `getComputedStyle(checkbox).borderColor` resolves from `--platform-primary`. That converts "we hardened the boundary" into "the boundary is structurally enforced."

Together with the typography Termina constraint and the org-side Theme Governance, this becomes the third pillar of a single canon: `mem://brand/cross-zone-theme-isolation.md`.

