
# Fix the actual remaining light-mode bug: global custom-theme overrides are still beating the selected built-in theme

## What’s actually broken

The selected built-in theme is not the only theme system in play.

The screenshot shows a useful split:
- the **selected card + mesh tint** indicate Matrix is being chosen
- the **actual surface tokens** (page, cards, borders, selected-state chrome) still read bone-like

That means the `theme-matrix` class is likely landing, but **higher-precedence inline CSS variables on `<html>` are still overriding the built-in theme tokens**.

## Root cause

The remaining problem is not palette values. It is **global override ownership**.

### 1. `useColorTheme.ts` is the intended owner of built-in dashboard themes
It applies exactly one `theme-*` class to `<html>` and persists `org_color_theme`.

### 2. `ThemeInitializer.tsx` is still a second global theme writer
It runs on every `org-dashboard` route and fetches:

- `user_preferences.custom_theme`
- `user_preferences.custom_typography`

Then it writes those values inline onto `document.documentElement.style`.

Inline `--background`, `--card`, `--border`, `--primary`, etc. will always beat `.theme-matrix`, `.theme-jade`, `.theme-orchid`.

### 3. The stale-cleanup fix was necessary, but not sufficient
The previous fix clears stale inline vars before reapplying. That solved “old leftovers stick forever.”

But if `custom_theme` is non-null in `user_preferences`, `ThemeInitializer` now **correctly re-applies it every load** — which still overrides the built-in theme by design.

So the bug class changed from:
- “stale inline vars survive”

to:
- “saved custom theme overrides are globally active when they should not be”

### 4. This matches the current architecture
`ThemeEditor` and `TypographyEditor` only appear in the internal Design System tooling, but `ThemeInitializer` applies those saved overrides to the entire organization dashboard. That leaks editor-level preview/theme-authoring state into normal production surfaces.

## The fix

## 1) Stop globally applying `custom_theme` / `custom_typography` on normal dashboard routes

**File:** `src/components/ThemeInitializer.tsx`

Change `ThemeInitializer` from a global “apply saved custom theme everywhere” component into a **cleanup / route-scoped reconciler**.

### New contract
- On normal dashboard routes: clear managed inline theme/typography vars so built-in theme classes win
- On explicit editor-preview routes only: allow custom editor hooks to apply inline overrides
- On sign-out / route exit: clear managed inline overrides

In practice:
- keep `MANAGED_ORG_OVERRIDE_KEYS`
- keep `clearManagedOrgOverrideVars()`
- remove the part that globally fetches and applies `custom_theme` / `custom_typography` for every org-dashboard route
- optionally gate any future apply behavior behind a dedicated editor route check (e.g. Design System only)

This makes `ThemeInitializer` a guardrail, not a competing theme engine.

## 2) Make the editor hooks own preview lifecycle locally

**Files:**
- `src/hooks/useCustomTheme.ts`
- `src/hooks/useTypographyTheme.ts`

These hooks already fetch saved editor data and apply it when the editor loads. That is the correct place for preview behavior.

Add cleanup ownership so editor previews do not leak after navigation:

### `useCustomTheme.ts`
- export a `clearCustomThemeVariables()` helper over `ALL_CUSTOM_THEME_KEYS`
- on hook unmount, remove all managed custom color vars
- when discarding/resetting, clear only managed custom color vars, then optionally reapply local preview state if still mounted

### `useTypographyTheme.ts`
- export a `clearTypographyVariables()` helper over `ALL_TYPOGRAPHY_KEYS`
- on hook unmount, remove all managed typography vars
- keep reset/discard behavior local to the editor

This ensures:
- Design System / editor pages can still preview saved custom themes
- leaving the editor restores the normal dashboard theme system
- the saved editor preset no longer hijacks the production dashboard globally

## 3) Keep `useColorTheme.ts` as the sole owner of built-in color themes

**File:** `src/hooks/useColorTheme.ts`

No architecture rewrite needed here. This should remain the only place that manages `theme-*` classes for normal dashboard theming.

Optional defense-in-depth:
- add a small reconcile effect that re-applies the current theme class if the route is in the dashboard and no editor preview is active
- do not clear inline vars here; ownership stays separated:
  - `useColorTheme` = class-based built-in themes
  - editor hooks / initializer = scoped inline preview cleanup

## 4) Add a regression guard for this exact bug class

**New test**
- e.g. `src/test/theme-inline-override-scope-canon.test.tsx`

Assert that:
- non-editor routes must not leave any `ALL_CUSTOM_THEME_KEYS` inline on `<html>`
- built-in dashboard themes are class-owned, not inline-owned
- editor tooling is the only allowlisted surface allowed to write theme token overrides inline

This prevents the same “ThemeEditor data leaks into live dashboard theme” regression from returning.

## Files to modify

- **`src/components/ThemeInitializer.tsx`**
  - stop global application of saved `custom_theme` / `custom_typography`
  - keep cleanup logic
  - scope any apply behavior to explicit editor preview routes only

- **`src/hooks/useCustomTheme.ts`**
  - add canonical clear helper
  - clean up managed inline vars on unmount
  - keep preview behavior local to editor lifecycle

- **`src/hooks/useTypographyTheme.ts`**
  - add canonical clear helper
  - clean up managed inline vars on unmount
  - keep typography preview local to editor lifecycle

- **Optional new test**
  - `src/test/theme-inline-override-scope-canon.test.tsx`

## Verification

1. On `/org/drop-dead-salons/dashboard/admin/settings`, select:
   - Matrix
   - Jade
   - Orchid

   After each click:
   - page background changes to that theme
   - cards/borders/selected ring/check also change to that theme
   - no bone-colored surfaces remain unless Bone is selected

2. Hard refresh on the settings page:
   - chosen built-in theme still paints correctly
   - no bone inheritance returns

3. Visit the internal Design System / editor page:
   - custom theme preview still works there
   - saved custom editor theme can still be loaded and previewed

4. Navigate away from the editor back to normal dashboard routes:
   - inline editor overrides are cleared
   - built-in org theme fully takes over again

## Why this is the right fix

The earlier fixes targeted:
- wrong `theme-bone` class ownership
- stale inline override cleanup

Those were real issues, but the current bug is the next layer deeper:

**saved editor-level custom theme data is still being globally applied to production dashboard routes.**

Until that second theme engine is scoped or removed, built-in themes like Matrix/Jade/Orchid can never be trusted to render their real light-mode palettes.

## Prompt feedback

What you did well:
- You kept pushing past a plausible but wrong answer.
- “Themes are inheriting Bone” was the right framing.
- The latest screenshot is especially high-signal because it suggests the selected theme state is changing while the actual surfaces are not.

Even stronger framing next time:
- “The mesh tint / selected state changes, but page/card/border tokens stay Bone.”
That phrasing immediately isolates the bug to **class-based theme vs inline-token precedence**.

## Further enhancement suggestions

1. **Add a small theme-integrity debug panel**
   - current `theme-*` class on `<html>`
   - current inline managed vars on `<html>`
   - computed `--background`, `--card`, `--primary`, `--border`
   This would make theme bugs diagnosable in seconds.

2. **Add a single-writer canon for theme ownership**
   - built-in dashboard themes may only be owned by `useColorTheme`
   - editor preview overrides may only be active on allowlisted editor routes
