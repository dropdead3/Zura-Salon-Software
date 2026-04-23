
# Fix the theme rendering bug at its actual root cause: `<html>` is being held on `theme-bone` by the pre-paint script while React crashes before `useColorTheme` can replace it

## What's actually happening (proven by network + error logs)

Three pieces of evidence converge on a single root cause:

1. **Network panel (20:30:34)**: `GET /site_settings → {theme: "neon"}` for org `fa23cd95-…` (Drop Dead Salons), followed by `PATCH /site_settings → 204` setting it to whatever was just clicked.
2. **Runtime error (still firing)**: `Uncaught Error: Should have a queue. … at useState at useBaseQuery at useQuery at useSiteSettings at RevenueDisplayProvider`.
3. **Screenshot**: picker shows Zura selected, toast says "Zura is now active", but every surface (page bg, sidebar, top nav, picker tile background) is bone/oat — not Zura's lavender, not neon's hot pink, not the DB value, not the click value. **Bone.**

The only thing that authors `theme-bone` on `<html>` independent of `useColorTheme` is the pre-paint script in `index.html` (lines 42–58):

```html
var color = localStorage.getItem('dd-color-theme') || 'zura';
…
root.classList.add('theme-' + color);
```

This script runs once on hard load. For users who previously had `bone` saved in the generic localStorage key (or whose generic key is empty during a browser-storage quirk), `<html>` gets `class="theme-bone"` immediately at first paint. `useColorTheme.applyTheme()` is supposed to overwrite this within the first React commit — but **`useColorTheme` never runs**, because `RevenueDisplayProvider` crashes upstream with "Should have a queue", which prevents `DashboardLayout` (and therefore `useColorTheme`) from ever mounting.

The "Should have a queue" error is a Fast Refresh hook-count drift: the previous fix added 3 hooks (`useEffect` + 2 `useRef`) to `useSettingsOrgId`, and any fiber that mounted before that file was hot-reloaded still has the old hook layout. `useQuery`'s internal `useState` reads the wrong slot → throw.

So the visible symptom (everything looks bone) is the union of two failures:
- pre-paint script paints bone on first load (for this user, this org)
- React tree crashes at `RevenueDisplayProvider` so `applyTheme` never gets to swap in the right theme class

A hard reload would mask the runtime error temporarily, but the deeper persistence-vs-pre-paint mismatch remains for any org whose DB theme ≠ the generic localStorage hint.

## Why prior rounds didn't catch this

Every previous round assumed `useColorTheme` was actually running. The combination of "DB writes succeed", "picker shows correct selection", and "rendered surfaces are bone" only makes sense if the picker is rendering inside a React subtree that survives the crash (settings detail uses its own hook instances), while the global `useColorTheme` mount in `DashboardLayout` never gets reached.

## Implementation plan

### 1. Make `useSettingsOrgId` truly hook-stable across Fast Refresh
**File:** `src/hooks/useSettingsOrgId.ts`

The current version added `useEffect` + 2× `useRef` for dev-only logging. That's the trigger for the HMR hook-count drift. Move the dev logger out of the hook entirely:

- Remove the `useEffect` and both `useRef` calls.
- The hook becomes exactly two `useContext` calls + a pure expression.
- Replace the in-hook logger with a tiny module-scoped `Map<orgId, lastSource>` that gets compared and logged inside the resolved `return` path (not as a hook). No React state involved.

Result: the hook returns to a 2-hook signature that's stable across HMR and matches every prior version of the file.

### 2. Make `useColorTheme` resilient to the pre-paint mismatch
**File:** `src/hooks/useColorTheme.ts`

Two small additions:

a. **Detect pre-paint mismatch on first DB resolution.** When `dbLoaded` first becomes true and `dbTheme` is non-null, check `<html>` class list. If the DOM theme class doesn't match `dbTheme`, force `applyTheme(dbTheme, orgId)` immediately (one-shot per org). This bridges the gap between the pre-paint script and the React commit.

b. **Run `applyTheme` synchronously during `useColorTheme`'s body** when `colorTheme` differs from the current DOM class — *not* only inside `useEffect`. The effect runs after commit; for theme classes, we want the swap to happen the same render so layout/paint don't flash bone. Use a `useLayoutEffect` instead of `useEffect` for the DOM-sync.

### 3. Move the pre-paint hint to be org-scoped-aware
**File:** `index.html`

Currently the pre-paint reads `localStorage.getItem('dd-color-theme')` (generic). After the user lands on `/org/<slug>/dashboard/...`, the better hint is the org-scoped key `dd-color-theme:<orgId>`. We don't know `orgId` at pre-paint time, but we DO know the URL slug.

Change the script to:
- Parse `/org/<slug>/` from `location.pathname`.
- If a slug is present, look up `dd-color-theme:slug:<slug>` (a new convention).
- Fall back to the generic key if no slug match.

In `useColorTheme.ts`, also write `dd-color-theme:slug:<slug>` whenever an org's effective slug is known. This eliminates the cross-org pre-paint flash.

### 4. Move dev-only theme integrity HUD out of the resolver hook
**New file:** `src/components/_dev/ThemeIntegrityHud.tsx` (DEV builds only)

A tiny fixed-corner component mounted in `App.tsx` under `import.meta.env.DEV`. Reads:
- `<html>` class list
- Computed `--background` from `getComputedStyle`
- Resolved org id (via `useSettingsOrgId`)
- Last theme source written to a module-scoped variable in `useColorTheme.ts`

Renders one line of text. No effect on production.

This replaces the in-hook console logger entirely so the resolver hook stays 2-hook-pure.

### 5. Verify
- Hard reload `/org/drop-dead-salons/dashboard/admin/settings`.
- Confirm no "Should have a queue" runtime error.
- Click each affected theme: Zura, Rosewood, Sage, Marine, Cognac, Noir, Neon, Peach.
- After each click: page bg, mesh tint, sidebar, top nav, card surfaces all match the selected theme's hue family.
- Switch orgs in God Mode. Confirm theme tracks the impersonated org.
- Reload mid-session. Confirm the saved theme renders without a bone flash.

## Files to modify

- `src/hooks/useSettingsOrgId.ts` — strip `useEffect` + `useRef`s
- `src/hooks/useColorTheme.ts` — `useLayoutEffect`, pre-paint mismatch detection, slug-keyed cache write
- `index.html` — slug-aware pre-paint script
- `src/components/_dev/ThemeIntegrityHud.tsx` (new) — dev HUD
- `src/App.tsx` — mount HUD in DEV

## Out of scope

- Re-tuning palette HSL values (already correct)
- Touching `index.css` token blocks
- Re-architecting `useSiteSettings`
- Editor-side `useCustomTheme` / `useTypographyTheme`

## Why this is the right fix

Persistence is working. The picker is wired correctly. The CSS tokens are correct. The only remaining gap is **the moment between "page paints" and "useColorTheme runs"** — and right now that gap is being filled by `theme-bone` from a pre-paint script that doesn't know which org the user belongs to. Layering on top: a Fast Refresh artifact crashing the React tree means even when `useColorTheme` *would* run, it doesn't get to. Steps 1–3 close both gaps directly.

## Further enhancement suggestions

1. **Theme + Org dev HUD** (built into step 4) — visible source of truth for every theme question going forward.
2. **Single-writer canon for `<html>` theme classes**: Vitest assertion that only `useColorTheme.applyTheme`, `Layout.tsx` (public), and the `index.html` pre-paint script may write `theme-*`. Any new writer requires explicit allowlisting.
3. **Hook-stability canon for resolver hooks**: ESLint rule forbidding `useEffect`/`useRef`/`useState` in `useSettingsOrgId.ts`, `useEffectiveUserId.ts`, and other shared resolver hooks. Plus a Vitest snapshot of each resolver's hook count.
4. **Pre-paint contract test**: a Vitest test that parses `index.html`, extracts the pre-paint script, and asserts (a) it reads slug-scoped storage when a slug is in the URL, (b) it never hardcodes a fallback theme other than the documented default, (c) it doesn't apply `dark` when the resolved theme already implies a mode.
5. **Theme-coherence canon**: assert the picker's preview swatches stay within tolerance of the real CSS token family in `index.css`, so a future palette tune in one place is mirrored in the other.

## Prompt feedback

What you did well:
- "That still did not fix it" with a fresh screenshot kept the loop tight and forced a deeper root-cause pass instead of another palette tweak.

A stronger version next time:
- Note whether the page was hard-reloaded since the last fix. The "Should have a queue" error is a Fast Refresh artifact that disappears on hard reload — knowing this would have isolated the persistent symptom from the HMR symptom in one round.
- Note what color the **page background behind the picker grid** actually looks like (lavender vs oat vs hot-pink). The picker tiles themselves render their own swatches so they're not a reliable signal of the active theme.
