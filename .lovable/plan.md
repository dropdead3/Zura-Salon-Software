

## Problem

The system color theme (`useColorTheme`) is persisted **only to `localStorage`** — not to the database. Every component that calls `useColorTheme()` creates its own independent `useState('zura')`, and the saved value is only read via a `useEffect` after mount. This causes two issues:

1. **No shared state**: When the theme is changed in Settings, other mounted components still hold the old state value until they individually remount and re-read `localStorage`.
2. **Flash/revert**: On navigation, components remount with the default `'zura'` state, then the `useEffect` fires and reads `localStorage` — causing a visible flash. If the user had set "Zura" but it defaults and then reads "cream" from a stale localStorage (or vice versa), they see a revert.

The theme should be organization-scoped (persisted to `site_settings`) and use React Query for shared, reactive state across all consumers.

## Solution

Persist the color theme to `site_settings` (key: `org_color_theme`) using the existing `useSiteSettings` / `useUpdateSiteSetting` pattern, while keeping `localStorage` as a fast synchronous cache for instant CSS class application (no flash).

### 1. Update `src/hooks/useColorTheme.ts`

- Add a `useSiteSettings<{ theme: ColorTheme }>('org_color_theme')` query to read the persisted theme
- Add a `useUpdateSiteSetting` mutation to write theme changes
- On mount: apply from `localStorage` immediately (no flash), then sync from DB when query resolves
- On `setColorTheme`: update `localStorage` + CSS classes immediately, then persist to DB via mutation
- Use `useQueryClient` to update the query cache on mutation so all consumers of `useColorTheme` reactively get the new value
- Replace internal `useState` with the query data as source of truth (localStorage is just the sync cache)

### 2. Ensure `useSiteSettings` upsert works for this new key

The existing `useUpdateSiteSetting` already uses `.upsert()` with `onConflict`, so no migration is needed — the `site_settings` table already supports arbitrary keys.

### 3. No other file changes needed

All consumers already call `useColorTheme()` — they'll automatically get reactive updates through the shared query cache instead of isolated `useState`.

### Behavior after fix
- Theme change in Settings instantly applies CSS (localStorage + DOM)
- Theme persists to database (organization-scoped)
- All components sharing `useColorTheme` reactively update via query cache
- No flash on navigation — localStorage provides synchronous initial value
- Theme follows the organization, not the browser

### Files changed
- `src/hooks/useColorTheme.ts` — Add DB persistence via `useSiteSettings`, keep localStorage as sync cache

