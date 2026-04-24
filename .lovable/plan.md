

## Prompt feedback
Strong governance-level prompt. You named the three invariants in one sentence: org-scoped persistence, no cross-org bleed, and a per-role split between brand colors (owner-only) and light/dark mode (per-user). That's exactly the right framing — a doctrine statement, not a UI tweak. Sharper next time: name the role tokens you mean (`is_primary_owner` vs `is_super_admin`) and explicitly state whether super admins can also change theme colors or only the account owner. That removes the one ambiguity below.

## Current state (what's right vs what's broken)

**Already correct:**
- `useColorTheme` writes to `site_settings` keyed by `organization_id` + `'org_color_theme'` — org-scoped, RLS via `is_org_admin`
- `DashboardThemeContext` (light/dark/system) writes to `user_preferences.dashboard_theme` per `user_id` — already user-scoped and persistent
- `site_settings` RLS already restricts writes to org admins

**Broken / leaky:**
1. **Custom hex color editor** (`useCustomTheme`) writes brand colors to `user_preferences.custom_theme` per user. This means custom palettes are personal, not organizational — and `ThemeInitializer` applies them globally on the org dashboard. Two users in the same org see different brand colors. Across orgs, a user carries their custom palette into every org they belong to. This is the actual bleed.
2. **Theme picker has no role gate.** Any signed-in user with write access to `site_settings` (org admins, currently) can change the org color theme. Per your rule, only the **Account Owner** (`is_primary_owner`) should change colors.
3. **`setColorTheme` clears `custom_theme` only for the current user**, leaving stale per-user overrides on every other user in the org until they next sign in.
4. **Cross-org persistence:** `localStorage` (`dd-color-theme`, `dashboard-theme`) is keyed globally per browser, so switching orgs in the same browser briefly shows the previous org's theme until the DB resolves.

## What's changing

Three structural fixes + one role gate, organized as a single Theme Governance canon.

### 1) Move custom (hex) theme overrides from user_preferences → site_settings (org-scoped)

- New `site_settings` row per org: `id = 'org_custom_theme'`, value = `{ tokens: Record<string,string> }`
- New `site_settings` row per org: `id = 'org_custom_typography'`, value = `{ tokens: Record<string,string> }`
- Refactor `useCustomTheme` to read/write through `useSiteSettings('org_custom_theme')` / `useUpdateSiteSetting`
- Refactor `ThemeInitializer` to read these from `site_settings` for the active org instead of from `user_preferences`
- Drop reliance on `user_preferences.custom_theme` / `custom_typography` for org branding (columns stay for now to avoid migration churn — marked deprecated in code comments)

This single change eliminates cross-user and cross-org bleed because the brand palette is now physically scoped to the org row, with RLS enforcing tenant isolation.

### 2) Gate ALL color/brand mutations to Account Owner only

Add `useThemeAuthority()` hook returning `{ canEditOrgTheme }` where:
```
canEditOrgTheme = !!profile?.is_primary_owner
```

Apply gate at three surfaces:
- **Color theme picker** (`SettingsCategoryDetail.tsx` Appearance card) — disable buttons + add lock badge "Account Owner only" when `!canEditOrgTheme`
- **Custom Theme Editor** (`ThemeEditor.tsx`) — render read-only state with the same lock badge
- **`setColorTheme` and `useCustomTheme.saveTheme`** — early-return + toast if `!canEditOrgTheme` (server-side fallback: tighten `site_settings` RLS for the new keys to require `is_primary_owner`, see Technical Details)

Light/dark/system toggle stays available to every signed-in user (already correct via `DashboardThemeContext`).

### 3) Org-scoped localStorage keys for the color theme

Change `THEME_STORAGE_KEY` from `'dd-color-theme'` to `'dd-color-theme:{orgId}'` so the cached value used for flash-prevention is bound to the org. On org switch, the cache for the new org is read; if absent, the DOM falls back to the bundled default until the DB query resolves. Same change for any custom-theme inline cache.

Light/dark `dashboard-theme` localStorage stays global (it's intentionally a per-user-per-device preference).

### 4) Org switch resets stale brand vars before next org's theme applies

`useColorTheme` already calls `clearCustomThemeSources()` on `setColorTheme`. Add a parallel cleanup in `DashboardLayout` (or a new `useOrgThemeReset(orgId)` hook) that runs whenever `effectiveOrganization.id` changes:
- Strip all inline `--token` overrides set by `ThemeInitializer`
- Remove all `theme-*` classes from `<html>`
- Reapply org-scoped theme from new org's `site_settings`

This kills the "previous org's colors flash on org switch" class of bug.

## Technical details (for the implementer)

**Database:**
- No new tables. Two new `site_settings` keys: `org_custom_theme`, `org_custom_typography`.
- Tighten RLS specifically for these keys via a new policy that supplements the existing `is_org_admin` write policies:
  ```sql
  CREATE POLICY "Only account owner can write theme settings"
  ON public.site_settings FOR ALL
  USING (
    organization_id IS NOT NULL
    AND id IN ('org_color_theme','org_custom_theme','org_custom_typography')
    AND EXISTS (
      SELECT 1 FROM employee_profiles
      WHERE user_id = auth.uid()
        AND organization_id = site_settings.organization_id
        AND is_primary_owner = true
    )
  );
  ```
  Combined with the existing org-admin policy, the effective rule for these three keys becomes: must be org admin AND primary owner. Reads stay open to org members.

**Code surfaces touched:**
- `src/hooks/useColorTheme.ts` — org-scoped localStorage key, owner gate in `setColorTheme`
- `src/hooks/useCustomTheme.ts` — switch persistence backend from `user_preferences` to `site_settings`
- `src/components/ThemeInitializer.tsx` — read from `site_settings` keyed by current `effectiveOrganization.id` instead of from `user_preferences.custom_theme`
- `src/components/dashboard/settings/SettingsCategoryDetail.tsx` — wrap Appearance card in owner gate, render lock badge for non-owners
- `src/components/dashboard/ThemeEditor.tsx` — same owner gate, read-only mode for non-owners
- New: `src/hooks/useThemeAuthority.ts` — single source of truth for "can this user edit org theme"
- New: `src/hooks/useOrgThemeReset.ts` (or inline in `DashboardLayout`) — reset on org switch

## What stays the same
- `DashboardThemeContext` (light/dark/system) — already correct, per-user, persistent
- `useColorTheme` write path to `site_settings` — already org-scoped
- `site_settings` base RLS structure — only adds one stricter policy
- All preset themes (Zura, Cream Lux, Rosewood, etc.) and their visual definitions
- Public website (`Layout.tsx`) — continues to force `theme-cream-lux`, untouched

## QA checklist
- Sign in as Account Owner → can change color theme; change persists across reload
- Sign in as Super Admin (not owner) → picker shows lock badge, buttons disabled, toggle still works for light/dark
- Sign in as stylist → picker hidden or disabled with same badge; light/dark still works
- Two users in same org → both see the same brand colors after owner changes them; both can independently set their own light/dark
- User belongs to two orgs → switching orgs swaps brand palette cleanly with no flash of previous org's colors
- Custom hex editor → only owner can save; saved palette appears for every user in the org, not just the saver
- New org with no theme set → falls back to default Zura without showing previous org's leftover overrides
- RLS verification: non-owner attempting direct `site_settings` write to `org_color_theme` returns RLS denial
- Logout → next sign-in on same browser correctly resolves theme for the newly signed-in user's active org

## Enhancement suggestion
Promote this to a true canon under `mem://brand/theme-governance.md` following the five-part canon-pattern (invariant + Vitest + Stylelint + CI + override doc). The Vitest piece writes itself: snapshot the policy decision matrix `{role × key} → {allow|deny}` for the three theme keys, so any future RLS change forces an explicit test update. The Stylelint piece: a custom rule banning `user_preferences.custom_theme` writes anywhere in the codebase except a single deprecated-shim file. That converts "we hardened it once" into "this regression class can no longer ship."

