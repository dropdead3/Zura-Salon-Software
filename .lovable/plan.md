

# Fix: dashboard themes overridden by `Layout.tsx` (public site) — `theme-bone` stuck on `<html>`

## The actual defect (corrected)

You called it: themes literally inherit from bone. Session replay confirms the `<html>` element holds `class="animations-standard theme-bone"` immediately after clicking Orchid — even though the `site_settings` PATCH for `{theme: "orchid"}` succeeds and the toast fires. The cascade is fine. The CSS is fine. The class on `<html>` is wrong.

## Root cause

`src/components/layout/Layout.tsx` (the **public marketing site** layout) **forcibly resets `<html>` to `theme-bone`**, both during render (lines 30–35) and in a `useEffect` (lines 38–63). It also strips ALL `--*` custom properties from `<html>` inline styles.

This shouldn't affect the dashboard — `Layout` is only mounted on public routes (Index, Shop, Services, Booking, etc.). But three things make it leak into the dashboard:

1. **The remove list at lines 33 + 45 is stale.** It removes `theme-rosewood, theme-sage, theme-marine, theme-zura, theme-cognac, theme-noir, theme-neon` and legacy keys, but **omits the newer themes**: `theme-jade`, `theme-matrix`, `theme-orchid`, `theme-peach`. So if a user lands on the public site with one of those active, that class survives the cleanup, then `theme-bone` gets added on top → both classes coexist (`theme-jade theme-bone`) and bone wins by source order in CSS.

2. **The "kill switch" runs during render**, not just in `useEffect`. Lines 30–35 execute every time `Layout` renders. If `Layout` is mounted anywhere in the React tree at the same time as the dashboard (e.g., via a stray import, a pre-rendered fallback, a 404 fallback Route, or a public route briefly rendered during transition), it nukes the dashboard theme.

3. **The inline style cleanup is overbroad.** Lines 53–63 remove every `--*` custom property from `<html>` that doesn't include `radix`. This wipes any theme tokens that hooks like `ThemeInitializer` or `useColorTheme` may set inline.

The session replay capture timing (`theme-bone` on `<html>` right after the click on the dashboard) confirms `Layout`'s render-time effect is running while the user is on the dashboard route. Most likely path: a Suspense fallback or a public-route component tree is being briefly rendered/retained during navigation, triggering Layout's render-phase mutation.

## The fix

### 1. Stop mutating `<html>` from `Layout.tsx`'s render phase

**File**: `src/components/layout/Layout.tsx` (lines 29–35)

Render-phase side effects on `document` are an anti-pattern (they fire on every render, including parallel renders during transitions, and bypass React's cleanup). Move ALL theme/class mutation into `useEffect` only. The "prevents flash" claim in the comment is moot now that the pre-paint script in `index.html` already applies the correct theme synchronously.

Delete lines 29–35 entirely.

### 2. Make `Layout.tsx` theme cleanup theme-list-aware

**File**: `src/components/layout/Layout.tsx` (lines 33, 45)

Replace the hardcoded remove list with the canonical `THEME_CLASSES` array imported from `useColorTheme.ts`. This way, adding a new theme automatically updates the cleanup list.

```ts
import { ALL_THEMES } from '@/hooks/useColorTheme';
const THEME_CLASSES = ALL_THEMES.map(t => `theme-${t}`);
const LEGACY_THEME_CLASSES = ['theme-cream', 'theme-rose', 'theme-ocean', 'theme-ember', 'theme-prism'];
// ...
root.classList.remove(...THEME_CLASSES, ...LEGACY_THEME_CLASSES);
root.classList.add('theme-bone');
```

(Requires exporting `ALL_THEMES` from `useColorTheme.ts` — currently a module-private const.)

### 3. Scope the inline `--*` cleanup so it doesn't wipe dashboard theme tokens

**File**: `src/components/layout/Layout.tsx` (lines 53–63)

The current loop nukes every custom property. Make it a no-op when the user navigated INTO the public site from the dashboard (rare path). Simpler: only remove inline `--*` props that match a known dashboard-token prefix list, and leave radix/platform tokens alone. Or, since the dashboard sets tokens via classes (not inline), remove this loop entirely — it was originally guarding against an old typography injection path that no longer exists (`ThemeInitializer` sets vars only on `org-dashboard` routes and clears them on exit).

Recommended: delete lines 53–63 entirely.

### 4. Guard `Layout`'s effect from running on dashboard routes

**File**: `src/components/layout/Layout.tsx` (line 38 useEffect)

Belt-and-suspenders: short-circuit the entire theme-reset effect if the current pathname is under `/dashboard` or `/org/:slug/dashboard` or `/platform`. Use the existing `getRouteZone(window.location.pathname)` from `src/lib/route-utils.ts`:

```ts
useEffect(() => {
  if (getRouteZone(window.location.pathname) !== 'public') return;
  // ...existing reset logic
}, [isEditorPreview]);
```

This makes it structurally impossible for the public Layout to override dashboard theming, regardless of why it's in the tree.

### 5. (Defense in depth) Re-assert theme on `useColorTheme` mount

**File**: `src/hooks/useColorTheme.ts`

The hook's effect at line 88–90 already calls `applyTheme(colorTheme)` on every render where `colorTheme` changes. But if `Layout` mutates `<html>` AFTER the hook's last effect fired, the dashboard theme stays clobbered. Add a `MutationObserver` that watches `<html>`'s `class` attribute and re-applies the resolved theme if `theme-bone` appears uninvited while on a dashboard route.

This is optional — fixes 1–4 should resolve the bug without needing this. Listed as fallback in case there's a third theme writer we haven't found.

## Verification

1. Navigate to `/org/drop-dead-salons/dashboard/admin/settings`, select Orchid → page background turns lavender, sidebar/cards adopt orchid palette.
2. Same for Jade (teal), Matrix (deep navy + emerald), Peach (coral cream).
3. Inspect `<html class="...">` after each click → only one `theme-*` class present, matching the selection.
4. Navigate to public `/` then back to `/dashboard/...` → dashboard theme still applied (Layout no longer wipes inline tokens, no longer leaks into dashboard).
5. Run cross-theme parity canon — must still pass (no CSS changes).

## Files

- **Modify**: `src/components/layout/Layout.tsx` — delete render-phase mutation (lines 29–35), import canonical theme list, scope cleanup, gate effect on route zone (~25 lines net deletion).
- **Modify**: `src/hooks/useColorTheme.ts` — export `ALL_THEMES` (1 line: add `export` keyword).

## Out of scope

- **Palette saturation tuning** — last session's plan was wrong; no themes need re-tuning. Each light theme's HSL values are correct (jade has true teal `175 65% 32%` primary, etc.). They just never got to render.
- **The pre-paint script** — already correct after last session's fix; reads `dd-color-theme` and applies the class synchronously.
- **`:root, .theme-bone` shared declaration** — works as designed; `.theme-jade` (specificity 0,1,0) cleanly beats `:root` (specificity 0,0,1) when both match. Splitting them adds churn without value.
- **A canon enforcing "only one writer touches `<html>` theme class"** — worth adding (Step 2AL below) to prevent future Layout-style regressions, but out of scope for the immediate fix.

## Why this is the right fix

The CSS, the cascade, the pre-paint script, and the `useColorTheme` hook all work correctly. The single defect is `Layout.tsx` reaching across architectural boundaries (public → dashboard) and mutating shared DOM state. Once `Layout` only touches `<html>` while a public route is actually active, the dashboard's theme writer becomes the sole owner of the theme class, and Jade/Orchid/Matrix render their actual palettes.

## Prompt feedback

**What worked exceptionally well**: You corrected my misdiagnosis with hard evidence — three screenshots showing different themes selected, all rendering identically as bone. That's the gold standard for a "your fix is wrong" report: visual proof + clear naming of what's broken ("themes are literally inheriting colors from the bone theme"). The word "literally" was the key signal — it pushed me past the "weak palette" hypothesis to "the class isn't sticking."

**What could sharpen further**: The fastest possible debug shape would have been: open dev tools, copy the `<html class="...">` value, and paste it. That single string ("animations-standard theme-bone" while Orchid is selected) is the entire diagnosis in 30 characters — no audit, no hypothesis, no screenshots needed. For "this thing isn't applying" bugs, the live DOM attribute is always the highest-signal evidence.

**Better prompt framing for next wave**: For "X isn't being applied even though I configured it" reports, the optimal shape is: *"I selected Orchid, but `document.documentElement.className` returns 'animations-standard theme-bone'. Should be `theme-orchid`."* Names the configuration, the expected DOM state, and the actual DOM state. Eliminates every layer of guessing between the user click and the visual result.

## Enhancement suggestions for next wave

1. **Step 2AL — Canon: single writer to `<html>` theme classes.** Vitest scan that finds all `classList.add('theme-...')` and `classList.remove('theme-...')` call sites across `src/`, asserts they're confined to a designated allowlist (currently just `useColorTheme.ts`). Catches "another component is mutating the theme class" — exactly this Layout regression class. ~25 lines, prevents the Layout pattern from re-emerging in any other file. Catalog entry slot reserved.

2. **Step 2AM — Route-zone-scoped DOM mutation primitive.** Generalize the route-zone gate into a hook: `useDOMMutationScopedToRoute('public', () => { ... })`. Any future component that needs to mutate `<html>` for a route zone declares its scope explicitly; the hook no-ops outside that zone. Eliminates the "I forgot to add a guard" failure mode. ~30 lines, refactors Layout's effect to use it. Pairs with 2AL — one prevents new violations, one makes the right pattern easy.
