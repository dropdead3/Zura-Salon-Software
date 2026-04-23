<final-text># Fix the real remaining theme bug: theme state is leaking across organizations and consumers, so light-mode dashboards fall back to stale Bone/Zura values

## What’s actually happening

The current failure is no longer just a CSS-token problem.

The latest evidence shows a deeper state mismatch:
- the **settings card can show one theme selected**
- the **database can still hold a different org theme**
- the **dashboard can render with a stale light palette** that reads Bone-like

That means theme rendering is drifting across **three sources of truth**:
1. database (`site_settings.org_color_theme`)
2. browser local fallback
3. multiple mounted `useColorTheme()` consumers

## Root cause

## 1) The fallback cache is global, not organization-scoped
`useColorTheme.ts` stores the theme in a single browser key:

- `dd-color-theme`

That is wrong for:
- God Mode / “Viewing as” another organization
- multi-org owners
- switching between organizations in one browser session

So before the org’s DB value resolves, the current org can temporarily inherit the last theme used somewhere else. That matches the current contradiction where the UI can look like Zura/Bone while the org DB value is something else.

## 2) `useColorTheme()` is both state reader and side-effect writer
It:
- reads DB
- falls back to localStorage
- mutates `<html>` classes
- writes localStorage
- persists DB

And it is mounted in more than one place, including:
- `DashboardLayout.tsx`
- `SettingsCategoryDetail.tsx`

That makes it too easy for multiple consumers to race during load and re-apply stale fallback state.

## 3) Settings click flow is mixing unrelated systems
On theme click, `SettingsCategoryDetail.tsx` currently does all of this together:
- `setColorTheme(themeOption.id)`
- sync service category colors
- sync terminal splash
- show “Service colors synced…” toast

That makes the theme picker look “successful” even when the actual org theme source-of-truth is still reconciling somewhere else.

## Implementation plan

## 1. Make theme fallback organization-aware
**File:** `src/hooks/useColorTheme.ts`

Replace the single global localStorage key with an org-aware key pattern, e.g.:
- `dd-color-theme:${orgId}`

Behavior:
- if `orgId` exists, read/write only that org’s key
- only use a generic fallback when no org context exists yet
- stop letting one org’s last-selected theme bleed into another org’s dashboard

## 2. Stop using local fallback as authoritative once org context exists
**File:** `src/hooks/useColorTheme.ts`

Change resolution logic so that:
- once `orgId` is known, the org’s DB theme is the source of truth
- while that org-specific query is still loading, don’t treat stale global fallback as the selected dashboard theme
- preserve optimistic updates only for the currently active org/query key

This prevents the settings grid from showing a misleading selected card during God Mode / org switching.

## 3. Split theme synchronization from theme consumption
**Files:**
- `src/hooks/useColorTheme.ts`
- `src/components/dashboard/DashboardLayout.tsx`
- `src/components/dashboard/settings/SettingsCategoryDetail.tsx`
- `src/components/dashboard/settings/WebsiteSettingsContent.tsx`

Refactor so there is only one mounted writer for dashboard theme side effects.

Recommended contract:
- `DashboardLayout` owns the DOM synchronization (`<html>` theme class application)
- settings surfaces consume current theme state without becoming secondary writers

This can be done either by:
- introducing a small color-theme context/provider, or
- splitting the hook into a sync hook + a read/update hook

Goal: no more multiple mounted instances all applying fallback logic independently.

## 4. Decouple the theme click from secondary palette sync side effects
**Files:**
- `src/components/dashboard/settings/SettingsCategoryDetail.tsx`
- `src/components/dashboard/settings/WebsiteSettingsContent.tsx`

Keep dashboard theme selection understandable:
- theme click updates the dashboard theme first
- service category sync and terminal splash sync run after that as explicit secondary actions
- use clearer toasts so “dashboard theme saved” is not conflated with “service colors synced”

This won’t be the core fix, but it removes false positives during testing.

## 5. Add a regression guard for org-scoped theme ownership
**New test(s):**
- `src/test/color-theme-org-scope-canon.test.tsx` or similar

Assert:
- theme fallback keys are organization-scoped
- one org’s cached theme cannot become another org’s active theme
- non-layout consumers do not mutate `<html>` theme classes
- dashboard theme resolution prefers org DB state over unrelated cached state

## Files to modify

- `src/hooks/useColorTheme.ts`
- `src/components/dashboard/DashboardLayout.tsx`
- `src/components/dashboard/settings/SettingsCategoryDetail.tsx`
- `src/components/dashboard/settings/WebsiteSettingsContent.tsx`
- optional new test file for org-scoped theme regression coverage

## Verification

1. In God Mode, open `/org/drop-dead-salons/dashboard/admin/settings`
2. Switch between:
   - Peach
   - Orchid
   - Jade
   - Matrix
   - Zura
3. After each click verify:
   - selected card matches the actual rendered dashboard theme
   - page/card/sidebar/border tokens all reflect that theme in light mode
   - no Bone-like fallback appears unless Bone is explicitly selected
4. Hard refresh the page:
   - the same org keeps its saved theme
   - switching to another org does not inherit the first org’s cached theme
5. Re-enter God Mode / switch orgs:
   - each org restores its own theme correctly
   - no stale cross-org carryover from local storage

## Why this is the right fix

The current bug pattern is bigger than a bad palette token:

- Bone-like light surfaces keep appearing
- the selected card can disagree with the actual org theme
- the app is being used in God Mode, where org boundaries matter
- the theme fallback key is currently global

That combination strongly points to **cross-organization theme leakage + multi-consumer side effects**, not just one bad CSS rule.

This fix restores a clean ownership model:
- DB = org source of truth
- local cache = org-scoped fallback only
- DashboardLayout = single DOM writer
- settings screens = readers / user controls, not competing theme engines</final-text>