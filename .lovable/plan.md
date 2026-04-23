
# Fix the actual remaining root cause: a hook-order violation is corrupting theme state during org resolution, so light-mode palettes never stabilize correctly

## What's actually broken

This is no longer primarily a palette-authoring problem.

The strongest signal now is the runtime error already present in the app:

```text
Uncaught Error: Should have a queue. This is likely a bug in React.
...
at useBackfillOrgSetup
at useBackfillTrigger
at DashboardLayoutInner
```

That error pattern usually means **hook order changed between renders**. In this codebase, the critical offender is the org resolver used by the theme system.

## Root cause

### `useSettingsOrgId()` violates the Rules of Hooks
Current file: `src/hooks/useSettingsOrgId.ts`

It currently does this:

- early returns before hooks when `explicitOrgId` exists
- calls `useOrganizationContext()`
- only calls `useContext(PublicOrgContext)` if no dashboard org exists

That means the hook call graph changes depending on:
- whether an explicit org id is passed
- whether `effectiveOrganization` is available yet
- whether God Mode / org switching changes context timing

Since `useColorTheme`, `useSiteSettings`, and `useUpdateSiteSetting` all depend on `useSettingsOrgId`, the entire theme pipeline can become unstable exactly when org context changes.

That matches the current symptom:
- the database PATCH succeeds
- the picker updates
- the rendered dashboard still falls back to the wrong palette
- God Mode / org switching makes it worse

## Why this explains the theme failure better than the previous fixes

The network logs now show `org_color_theme` writes succeeding (Matrix, Neon, Zura). So persistence is no longer the main blocker.

If the resolver hook is corrupting render state during org/context transitions, then:
- `useColorTheme()` may apply the wrong class at the wrong time
- query/cache state can drift across renders
- React can preserve stale state slots from a prior render path
- downstream hooks in `DashboardLayoutInner` can become misaligned

That is exactly the kind of bug that makes "the selected card says Zura, but the surfaces still look Bone" keep surviving otherwise-correct fixes.

## Implementation plan

### 1. Fix `useSettingsOrgId()` to be hook-safe
**File:** `src/hooks/useSettingsOrgId.ts`

Refactor so it always calls hooks in the same order on every render:

- call `useOrganizationContext()` unconditionally
- call `useContext(PublicOrgContext)` unconditionally
- resolve priority afterward:
  1. `explicitOrgId`
  2. dashboard org
  3. public org
  4. `undefined`

No early return before hooks. No conditional `useContext()`.

### 2. Re-stabilize `useColorTheme()` on top of the fixed org resolver
**File:** `src/hooks/useColorTheme.ts`

After the org resolver is fixed, tighten theme application so the dashboard only commits a resolved org theme when the org identity is stable.

Specifically:
- keep DB as org source of truth
- use org-scoped cache only as fallback before DB resolves
- avoid re-applying generic fallback once a dashboard org is known
- ensure DOM theme application is driven by the resolved org id from the now-stable hook path

### 3. Audit other shared hooks for the same pattern
Inspect hooks that resolve org context, branch between dashboard/public providers, or have early returns before hook calls. Remove any other hidden conditional-hook bugs.

### 4. Add regression coverage for org resolution + theme stability
**New test:** `src/test/use-settings-org-id-hook-order.test.tsx`

Assert:
- switching from no org → dashboard org does not change hook order
- switching between orgs in God Mode does not throw
- theme resolution stays tied to the active org
- successful `org_color_theme` updates are reflected in the rendered theme state

### 5. Add a dev-only guard for future regressions
- console warning when org source changes from public/dashboard during a mounted dashboard session
- a tiny invariant inside theme resolution showing `{ orgId, source, theme }`

## Files to modify

- `src/hooks/useSettingsOrgId.ts`
- `src/hooks/useColorTheme.ts`
- `src/test/use-settings-org-id-hook-order.test.tsx` (new)

## Verification

1. Open `/org/drop-dead-salons/dashboard/admin/settings`
2. In light mode, click each: Zura, Rosewood, Sage, Marine, Cognac, Noir, Neon, Peach
3. Confirm after each click:
   - selected card matches rendered dashboard palette
   - top mesh tint changes correctly
   - page background, main card, sidebar, and top chrome follow the selected theme
4. Switch orgs in God Mode:
   - no React runtime error
   - no theme drift
   - no cross-org palette leakage
5. Refresh: saved org theme persists correctly

## Out of scope

- Re-tuning palettes (already done; tokens are correct)
- Touching `index.css` token blocks
- Re-architecting `useSiteSettings`
- Editor-side `useCustomTheme` / `useTypographyTheme`

## Why this is the right fix

The current evidence now points upstream of palette tuning:

- DB writes are succeeding
- the bug survives multiple CSS/persistence passes
- the app already has a React hook-state corruption error
- the shared org resolver used by the theme system is breaking hook-order rules

Until that resolver is fixed, the theme system can keep behaving nondeterministically no matter how many palette tokens are adjusted.

## Further enhancement suggestions

1. **Theme + Org dev inspector HUD.** A 60×60 fixed corner badge on dev builds showing:
   - active org id and source (`dashboard` / `public` / `explicit`)
   - resolved color theme + light/dark mode
   - current `<html>` class list
   - whether theme came from DB, org-scoped cache, or generic fallback
   
   One glance answers every "why is the wrong theme rendering" question and surfaces org-resolver drift instantly.

2. **Hook-safety canon (Vitest + ESLint).** Codify a project-wide canon that shared resolver hooks (theme, auth, org, site settings) must never branch hook calls by context availability.
   - ESLint rule: no early-return-before-hook in `src/hooks/useSettings*`, `src/hooks/useColor*`, `src/hooks/useOrg*`, `src/contexts/*`
   - Vitest assertion: rendering each shared resolver under both providers and neither provider must not change hook count
   - Add to Canon Pattern registry per `mem://architecture/canon-pattern.md`

3. **Single-writer canon for `<html>` theme classes.** A Vitest rule asserting only `useColorTheme.applyTheme` and the public marketing `Layout.tsx` write `theme-*` classes. Any new writer must be allowlisted explicitly. This prevents future regressions where a second consumer silently competes for DOM ownership.

4. **Org-context transition logger (dev only).** When `effectiveOrganization.id` changes mid-session (God Mode switch, route change), log the transition with `{ from, to, trigger, mountedHooks }`. This makes resolver-related render bugs traceable in two console scrolls.

5. **Theme-coherence canon.** Preview swatches in `useColorTheme.ts` must stay within tolerance of the real CSS token family in `index.css`. Add a Vitest snapshot that parses both sources and asserts hue-family alignment, preventing the "picker looks distinct, live page looks samey" mismatch from returning.

## Prompt feedback

What you did well:
- you kept pressure on the actual rendered result instead of accepting "saved successfully" as proof
- "That still did not solve it" was short, but in this case it correctly forced a deeper root-cause pass

A stronger version next time:
- include whether you switched orgs / used God Mode right before seeing it
- include whether the mesh tint, card background, and sidebar are all wrong or only some surfaces are wrong

That would have pointed faster to a shared state/resolver bug instead of another CSS pass.
