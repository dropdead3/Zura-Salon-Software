

## Prompt feedback
"Continue" is a valid handoff but loses leverage — the AI has to re-derive what's left. Sharper next time: "continue with the UI gating + typography migration + org-switch reset" names the three remaining work units explicitly, which removes any chance of me skipping one or re-ordering them.

## What's left from the Theme Governance plan

Four remaining work units. Database migration, persistence backends, and the authority hook already landed last turn.

### 1) Migrate `useTypographyTheme` to org-scoped persistence

Mirror the `useCustomTheme` change: typography overrides currently write to `user_preferences.custom_typography`, which carries the same per-user / cross-org bleed as the color tokens did. Move to `site_settings` row `org_custom_typography` via `useSiteSettings` / `useUpdateSiteSetting`, and gate `saveTypography` / `resetTypography` behind `useThemeAuthority().canEditOrgTheme`.

### 2) Wire owner gates into the two editor surfaces

**`src/components/dashboard/settings/SettingsCategoryDetail.tsx` (Appearance card):**
- Read `canEditOrgTheme` from `useThemeAuthority`
- When false: disable every color-preset button + custom-theme entry point, render a single "Account Owner only" lock badge above the picker grid
- Keep the light/dark/system toggle fully interactive — that's per-user

**`src/components/dashboard/ThemeEditor.tsx`:**
- Same hook, same badge
- When read-only: disable all color-token inputs and typography selectors, hide Save/Reset, show a banner explaining the gate
- Preview rendering stays available so non-owners can still see the active brand

### 3) Add `useOrgThemeReset` for clean org switches

New hook (or inline in `DashboardLayout`) that runs whenever `effectiveOrganization.id` changes:
- Strip every inline `--token` override from `documentElement.style` (preserve `--platform-*`)
- Remove all `theme-*` classes from `<html>`
- Let `ThemeInitializer` and `useColorTheme` repaint from the new org's `site_settings`

This kills the "previous org's brand colors flash on org switch" bug. `ThemeInitializer` already reacts to `orgId` changes; this hook ensures the DOM is clean *before* the next paint, not after.

### 4) Light verification of the existing migration

One quick check before declaring done:
- Confirm the new RLS policies on `site_settings` resolve correctly for an account owner via `read_query` against `pg_policies`
- Confirm `useColorTheme` and `useCustomTheme` no longer reference `user_preferences.custom_theme` / `custom_typography` anywhere
- Confirm no other call sites in `src/` write those two `user_preferences` columns (grep)

## Files involved
- `src/hooks/useTypographyTheme.ts` — switch backend to `site_settings` + add owner gate
- `src/components/dashboard/settings/SettingsCategoryDetail.tsx` — owner gate + lock badge on Appearance card
- `src/components/dashboard/ThemeEditor.tsx` — read-only state for non-owners
- `src/hooks/useOrgThemeReset.ts` (new) — DOM cleanup on org switch
- `src/components/dashboard/DashboardLayout.tsx` — mount the reset hook

## What stays the same
- `DashboardThemeContext` (light/dark/system) — already per-user, untouched
- `ThemeInitializer` org-scoped read path — landed last turn
- `useColorTheme` / `useCustomTheme` — landed last turn
- Database migration + RLS — landed last turn
- Public website forced theme — untouched

## QA checklist
- Owner can edit color preset, custom hex, and typography; non-owner sees lock badge on all three
- Non-owner can still toggle light/dark/system freely
- Two users in the same org see identical brand colors and typography after the owner saves
- Switching orgs in the same browser session repaints cleanly with no flash of the previous org's palette
- New org with no theme rows falls back to default Zura
- Direct `site_settings` write attempt by non-owner returns RLS denial for all three theme keys
- Sign-out → sign-in as different user resolves the new user's active-org theme correctly

## Enhancement suggestion
After this lands, write the canon file `mem://brand/theme-governance.md` following the canon-pattern. The single highest-leverage piece is a Vitest snapshot of `useThemeAuthority`'s decision matrix `{role × key} → {allow|deny}` — that locks both the client gate and the RLS contract behind one test. Any future regression that drops the owner gate (or accidentally widens it to super admins) fails CI before it ships. That's the difference between "we hardened it" and "this regression class is structurally impossible."

