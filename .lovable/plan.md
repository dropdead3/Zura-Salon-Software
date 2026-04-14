
Prompt feedback

- Good bug report. The detail that it reverts to cream after refresh, then immediately flips back to Zura when you enter System Settings, is exactly what exposed the real issue.
- Even stronger next time: include the exact URL before refresh and whether the wrong theme appears on all dashboard pages or only one page. In this case, that would have made the lazy-load pattern obvious even faster.

Problem

The theme is likely saving correctly, but it is not being applied globally on dashboard load.

Root cause

- `useColorTheme.ts` is the code that applies the `theme-zura` / `theme-cream` class to `document.documentElement`.
- But that hook only gets imported on certain screens, such as:
  - `src/components/dashboard/settings/SettingsCategoryDetail.tsx`
  - `src/components/dashboard/settings/TerminalSettingsContent.tsx`
- The top-level Settings page (`src/pages/dashboard/admin/Settings.tsx`) does not use that hook.
- So after a hard refresh on the Settings grid, no color-theme hook runs yet, and the app falls back to the CSS default in `src/index.css`, which is cream.
- When you click into System Settings, `SettingsCategoryDetail` lazy-loads, `useColorTheme` finally runs, and Zura gets applied immediately. That is why it looks like it “fixes itself.”

Implementation plan

1. Mount color-theme application globally in the authenticated dashboard shell
- Add a tiny initializer component that calls `useColorTheme()` once for all org dashboard routes.
- Best location: `PrivateAppShell` in `src/App.tsx` or the shared `DashboardLayout`.

2. Make theme application explicit inside the hook
- Update `src/hooks/useColorTheme.ts` so it applies the resolved `colorTheme` in an effect whenever that value changes.
- Keep the fast local cache behavior so there is no flash on reload.

3. Keep public site behavior isolated
- Only mount this initializer in the org dashboard shell.
- Do not apply it to the public website, since `src/components/layout/Layout.tsx` intentionally forces the public site to cream.

4. Optional cleanup
- Update `src/hooks/useSiteSettings.ts` to use `maybeSingle()` instead of `single()` for missing settings rows, so expected “no row yet” reads do not generate noisy 406 responses.
- Separate issue I noticed: `?subtab=display` does not restore the prior settings section on refresh because `Settings.tsx` only restores `category` and `tab=terminals`. That is independent from the cream-theme bug, but worth fixing next.

Technical details

- Relevant files:
  - `src/hooks/useColorTheme.ts`
  - `src/pages/dashboard/admin/Settings.tsx`
  - `src/components/dashboard/settings/SettingsCategoryDetail.tsx`
  - `src/App.tsx` or `src/components/dashboard/DashboardLayout.tsx`
  - optional: `src/hooks/useSiteSettings.ts`
- Expected result after fix:
  - Refreshing the Settings page keeps Zura applied immediately
  - The dashboard no longer waits for System Settings to mount before applying the saved theme
  - Theme behavior stays organization-scoped and consistent across pages

Enhancement suggestion

- After this fix, the next best improvement is restoring the exact Settings section/subtab after refresh, so users land back where they were instead of on the main Settings grid.
