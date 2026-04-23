

# Fix the actual root cause: a phantom writer is overwriting the saved theme with `bone`

## What the network logs prove

Reading the live PATCH/GET sequence to `site_settings.org_color_theme` (timestamps within 4 seconds):

```
PATCH {"theme":"bone"}    ← phantom writer
GET   "bone"
PATCH {"theme":"peach"}   ← user clicked Peach
GET   "peach"
PATCH {"theme":"bone"}    ← phantom writer overwrites peach
GET   "bone"
PATCH {"theme":"peach"}   ← user clicks Peach again
GET   "peach"
```

This is conclusive. A second writer is racing `setColorTheme` and PATCHing `theme: "bone"` back to the database. Every time the user picks Peach (or Jade, Matrix, Orchid), the phantom writer reverts it within ~1 second. The DB then echoes `bone` back to `useColorTheme`, which calls `applyTheme('bone')` and the page renders bone-tan despite the optimistic UI showing the user's selection as "selected".

This is the real bug — not palette tuning, not inline overrides, not class precedence. It's a **mutation race**.

## Where the phantom writer lives

The grep is conclusive: only `useColorTheme.ts` writes `org_color_theme`. So the phantom writes are coming from inside `useColorTheme` itself, called from a second mounted instance.

The mechanism:

1. `useColorTheme()` is consumed in multiple places (`SettingsCategoryDetail`, `WebsiteSettingsContent`, `DashboardLayout`, etc.).
2. Each instance independently fetches `dbSettings`. On first paint, before the DB GET resolves, `dbTheme` is `null` and `colorTheme` falls back to `getLocalTheme()` — which may be `'bone'` from a stale localStorage.
3. The legacy-migration `useEffect` at lines 75–85 fires when `dbLoaded && dbTheme` becomes truthy. The condition `raw && raw !== dbTheme` is intended to be a one-time legacy-key rewrite, but this effect is also re-evaluated when `updateSetting` (the mutation object) re-identifies after each successful mutation — its identity changes because `useMutation` returns a new object on each settle. That re-runs the effect with stale closure values from a prior render, triggering a spurious `mutate`.
4. Additionally, when one tab/instance fires `setColorTheme('peach')`, the optimistic cache update in `setQueryData` doesn't propagate to a second `useColorTheme` instance that already has a pending fetch in flight; that second instance resolves with the *prior* DB value, and its own effect re-applies it via `applyTheme`, then the legacy-migration branch can fire a `mutate` with the stale `dbTheme`.

The result is a write loop where one instance pushes `peach`, another pushes `bone`, ad infinitum.

## The fix

### 1. Remove the speculative re-write inside `useColorTheme`

**File:** `src/hooks/useColorTheme.ts` (lines 75–85)

The legacy migration effect fires on every render where `updateSetting` identity changes, which is every settle. Tighten it:

- Run the migration check **once** per session via a `useRef` latch keyed on the org id.
- Only fire `mutate` when `raw` is in `LEGACY_THEME_MIGRATION` (an actual legacy key like `cream`/`rose`), not on every value mismatch.
- Remove `updateSetting` from the dependency array — only depend on `dbLoaded`, `dbTheme`, `dbSettings?.theme`, `orgId`.

This eliminates the spurious "rewrite to current value" PATCHes that race the user's click.

### 2. Make `setColorTheme` the single source of truth for DB writes

**File:** `src/hooks/useColorTheme.ts`

- The DB-sync effect at lines 88–90 (`useEffect(() => applyTheme(colorTheme), [colorTheme])`) should only call `applyTheme` (DOM/localStorage), never trigger a DB write. It already does this correctly — keep as-is.
- Add a `setColorTheme` guard: do not `mutate` if `theme === dbTheme` (no-op when DB already matches). This prevents redundant writes.

### 3. Stabilize the optimistic cache update across instances

**File:** `src/hooks/useColorTheme.ts` lines 92–104

The `setQueryData(queryKey, { theme })` in step 2 of `setColorTheme` already updates the cache for the current org's query key. Confirm `useSiteSettings`'s mutation `onMutate` / `onSettled` does not invalidate immediately and re-fetch the *prior* value — looking at `useSiteSettings.ts`, `onSettled` calls `invalidateQueries`, which forces a refetch. If the refetch is in flight when a stale instance fires its own write, we lose. Solution:

- In `setColorTheme`, also update the cache by directly setting the value the new instances will resolve to, and rely on the PATCH 204 + the next GET to confirm. This already happens — but ensure no other code path can cancel and re-issue the GET with stale data.

### 4. Verification with the live evidence

After the fix, click Peach once and observe network:

- Expect: exactly one PATCH `{"theme":"peach"}`, one GET returning `"peach"`. No follow-up PATCH.
- Currently: two PATCHes (peach → bone), DB ends on bone.

Repeat for Jade, Matrix, Orchid. Each should produce exactly one PATCH and stick.

## Files to modify

- **`src/hooks/useColorTheme.ts`**
  - Add `useRef` latch on the legacy-migration effect so it runs at most once per org per session.
  - Restrict the migration `mutate` to actual legacy keys (`cream`, `rose`, `ocean`, `ember`, `prism`).
  - Remove `updateSetting` from the migration effect's deps.
  - Add a no-op guard in `setColorTheme`: skip `mutate` if `theme === dbTheme`.

That's it. Two-file scope reduced to one file, ~15 lines.

## Why this is the right fix

Every prior fix in this thread (palette tuning, Layout.tsx neutralization, inline override cleanup, ThemeInitializer scoping) was real but addressed symptoms one layer up. The network log proves the DB itself is being overwritten — no amount of CSS precedence or inline cleanup can survive a writer that resets the source of truth to `bone` within a second of every theme selection.

This was diagnosable from minute one with the network panel. Worth adopting as a standard debugging step for any "setting won't stick" bug: **read the PATCH bodies before reading the CSS.**

## Out of scope

- Re-tuning palettes (already done correctly for Peach — its `--background` of `25 50% 96%` is genuinely warm coral cream).
- Touching `useSiteSettings.ts` mutation logic (the issue is the caller, not the helper).
- Adding a write-deduplication layer to `useUpdateSiteSetting` (could be a future hardening, but not needed here).

## Prompt feedback

What you did exceptionally well:
- You stayed concrete: "Peach light mode still shows Bone" — observable, falsifiable, and tied to a specific theme so I could grep the exact tokens.
- You didn't accept the prior fix as final. The pattern of "AI ships a fix, user re-tests, AI confirms it without verifying" is one of the highest-impact prompt failures, and you broke that loop by re-checking.

Even sharper next time:
- The single highest-leverage move would be: when a setting refuses to stick, paste (or ask for) the network panel's PATCH bodies. The phrase "the PATCH body for site_settings shows `bone` even after I clicked Peach" would have collapsed three rounds of CSS investigation into one. Network evidence > visual evidence for persistence bugs.

## Enhancement suggestions

1. **Add a write-loop detector to `useUpdateSiteSetting`.** If the same key is mutated more than twice within 2 seconds with conflicting values, log a dev-only warning identifying the caller stack. This would have surfaced the phantom writer instantly the first time it ran.

2. **Add a Vitest canon: single-writer-per-key for `site_settings`.** Enumerate which hook owns each `site_settings` key and assert no other module imports `useUpdateSiteSetting` with that key string. The current architecture assumes single-writer ownership but doesn't enforce it.

