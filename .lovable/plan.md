

# Fix the dashboard rendering bone tokens despite Zura being selected

## What the screenshot proves

The 12:40 PM screenshot shows Zura selected in the picker, the toast "Zura is now active", BUT every dashboard surface — page background, mesh gradient at top-left, container card, sidebar — is unmistakably bone/oat tan, not lavender.

This is conclusive: **the rendered CSS tokens are bone's, even though the theme picker thinks Zura is active**.

## What I verified is NOT the cause

- **Token authoring** — `.theme-zura` at `src/index.css` line 742 has full coverage of color tokens with strong lavender hues (`--background: 265 45% 93%`, `--card: 265 42% 95%`, etc.).
- **CSS specificity / @layer ordering** — `.theme-bone` and `.theme-zura` are both inside `@layer base`, same specificity, source order favors Zura.
- **Inline overrides** — `useCustomTheme` and `useTypographyTheme` only mount inside the Design System editor. `ThemeInitializer` actively strips inline overrides on dashboard routes.
- **Hardcoded `theme-bone` className** — only exists on the public marketing `Layout.tsx`, never on dashboard routes.
- **`useColorTheme` write race** — already fixed in the previous round (migration latch + write guard).

## The one remaining root cause

**The mesh-gradient tint in the screenshot is warm/oat, not lavender.** That tint is class-bound to `html.theme-zura` vs `html.theme-bone` in `src/index.css` lines 3084 / 3092. So at the moment of render, the `<html>` element does **not actually carry `theme-zura`** — it carries `theme-bone`, despite the picker UI showing Zura selected and the toast firing.

Two paths can produce this:

### Path A — Stale DB value wins on every refetch

`useColorTheme` resolves `colorTheme` as `dbTheme` whenever DB has any value (line 93-94). The effect at line 123 then calls `applyTheme(colorTheme)`. If `drop-dead-salons` has `org_color_theme = { theme: 'bone' }` in the DB and the user's click PATCH never actually completes (or is overwritten by an immediate refetch returning stale data), the effect re-applies `bone` to `<html>` within milliseconds of the toast appearing. The picker UI uses optimistic cache state and stays "Zura selected" while the DOM has reverted.

### Path B — A second `useColorTheme` consumer is overwriting the optimistic cache

Settings detail mounts `useColorTheme` once for the picker grid. `DashboardLayout` mounts it again for the global sync. If the second instance's DB query is in-flight when `setColorTheme('zura')` fires, its `onSuccess` resolves with the prior `bone` value and calls `applyTheme('bone')` via the line 123 effect.

Either way, **the DB still holds `bone` for this org and the post-click re-render reverts the DOM**.

## Implementation plan

### 1. Make the DOM-sync effect respect optimistic state

**File:** `src/hooks/useColorTheme.ts`

The line 123 effect blindly calls `applyTheme(colorTheme)` whenever the resolved theme changes. After a `setColorTheme('zura')` click, the queryClient cache is set to `{ theme: 'zura' }` — but if the network PATCH is slow or a competing instance refetches first with stale `bone`, the cache flips back. Add a short-lived "optimistic lock":

- When `setColorTheme(theme)` runs, mark `theme` as the user's most recent intent in a `useRef`.
- The DOM-sync effect compares `colorTheme` against the latest user intent. If they disagree AND the divergence happened within ~3 seconds of the user click, skip the re-apply (the DB write hasn't settled yet).
- Once the DB confirms the new value, the lock clears naturally.

This prevents in-flight refetches from snapping `<html>` back to the prior DB value.

### 2. Force the DB mutation to win refetch races

**File:** `src/hooks/useColorTheme.ts` `setColorTheme`

Right now `setColorTheme` calls `updateSetting.mutate(...)` and trusts the existing `useUpdateSiteSetting` cache logic. Tighten it:

- `await queryClient.cancelQueries({ queryKey })` before issuing the PATCH so any in-flight refetch with stale data is killed.
- After mutation success, manually `setQueryData(queryKey, { theme })` again as a final write to guarantee the cache ends on the user's intent.

### 3. Add a one-time DB self-heal for `drop-dead-salons` (and any other org stuck on bone)

**File:** `src/hooks/useColorTheme.ts`

If `dbSettings?.theme === 'bone'` AND the org-scoped local cache says `'zura'` (or any other non-bone), this is the "stuck DB" pattern. Trigger a single `updateSetting.mutate({ theme: localValue })` to repair the DB to match what the user clearly chose. Latched by org id so it runs at most once per session.

This corrects the actual persisted state for orgs whose previous click rounds never made it to the DB.

### 4. Add a dev-only theme integrity logger

**File:** `src/hooks/useColorTheme.ts` (dev-build only)

When `applyTheme` runs, log `{ orgId, source: 'db' | 'org-cache' | 'generic', theme, htmlClass: document.documentElement.className }`. This makes the next "why is bone rendering" diagnosable in two console scrolls instead of two days.

### 5. Verify with the network panel after the fix

- Click Zura on `/org/drop-dead-salons/dashboard/admin/settings`
- Network panel must show: `PATCH site_settings → 204` then `GET site_settings → { theme: 'zura' }`
- DOM `<html>` must end on `class="... theme-zura"` (not `theme-bone`)
- Mesh tint at the top corners must read lavender (not warm tan)
- Reload — Zura must persist

## Files to modify

- **`src/hooks/useColorTheme.ts`** — only file requiring changes. ~30 lines of additions covering optimistic lock, refetch cancellation, post-mutation re-confirm, one-shot DB self-heal, and dev logger.

## Out of scope

- Re-tuning palettes (already done last round; tokens are correct).
- Touching `index.css` token blocks.
- Re-architecting `useSiteSettings` (the caller's race-handling is the right layer).
- Editor-side `useCustomTheme` / `useTypographyTheme` (cleaned by `ThemeInitializer`).

## Why this is the right fix

For three rounds we've fixed everything around the actual persistence layer — palettes, glass opacity, org-scoped local cache, write guards. The screenshot still shows the bone mesh-gradient class on `<html>`, which is impossible unless the DB itself still says `bone` and is winning re-render races against the user's click. Steps 1-3 close that gap directly:

- step 1 stops competing refetches from re-applying stale bone to the DOM,
- step 2 makes the user's click cancel any in-flight stale GET,
- step 3 self-heals orgs whose DB never received their previous Zura selection.

## Prompt feedback

What you did well: you stopped re-describing the symptom abstractly ("themes broken") and named the affected themes by name plus mode (light). That gave me a precise grep target across `index.css`.

What would have shaved another round: in your prompt, call out the **mesh tint** specifically — "the top-left page glow is still warm/tan even when Zura is selected" would have immediately pointed me to `html.theme-*` selectors at lines 3060-3170 instead of letting me re-walk the token tables. The mesh tint is the cleanest diagnostic in this codebase because it's class-bound and has no other override layer.

## Enhancement suggestions

1. **Theme integrity HUD (dev only).** A 60×60 fixed corner badge on dev builds showing the current `theme-*` class on `<html>`, the resolved `--background` HSL, and the source of truth (DB / org-cache / generic). One glance answers every "why is the wrong theme rendering" question.

2. **Single-writer canon for `<html>` theme classes.** A Vitest rule asserting only `useColorTheme.applyTheme` and `Layout.tsx` (public marketing) write `theme-*` classes. Any new writer must be allowlisted explicitly.

