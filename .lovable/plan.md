# Always default to hidden on session start; reveal is session-only

## Goal
Treat hide-numbers as a **per-session privacy fence**, not a saved preference. Every fresh login (and every fresh tab/session) starts with monetary values blurred. Operators reveal via the `h` hotkey or top-bar button — that reveal lasts for the current session only and never carries to the next login.

## Current behavior (to change)
`src/contexts/HideNumbersContext.tsx` reads/writes `employee_profiles.hide_numbers` on mount and on every toggle. So if a user revealed numbers yesterday, they're revealed at front-desk login today — the exact failure mode this feature exists to prevent.

## Plan

### 1. `src/contexts/HideNumbersContext.tsx` — strip persistence
- Remove the `useEffect` that loads `hide_numbers` from Supabase on mount.
- Remove the `supabase.from('employee_profiles').update(...)` calls inside `confirmUnhide` and `toggleHideNumbers`.
- Drop the `useAuth` / `supabase` imports (no longer needed in this file).
- Initial state stays `useState(true)` — hidden by default. State now lives only in React for the lifetime of the provider mount (i.e., the session).
- Keep `isLoading` in the interface for back-compat but resolve it immediately to `false` (no async load anymore). This prevents a flash of changed UI in any consumer that already reads it.
- Confirmation dialog (`requestUnhide` → `confirmUnhide`) stays exactly as-is — the warning copy is still correct.
- `toggleHideNumbers` (used by `h` hotkey + top-bar button) becomes a pure local state flip with no DB round-trip and no error rollback path.

### 2. Database — deprecate the column
- Add a migration that drops `employee_profiles.hide_numbers`. The column is referenced from exactly one file (this context) and nowhere else in the codebase or edge functions, so removing it is safe and prevents stale data from being read by any future code path.

### 3. Memory update
Update `mem://style/platform-ui-standards-and-privacy` to codify:
> **Session-only privacy contract**: `hideNumbers` defaults to `true` on every new session/tab. Reveal state is held in React only — never persisted to `employee_profiles`, `localStorage`, or `site_settings`. Re-login or new tab = re-blur. This protects front-desk and shared workstations from inheriting yesterday's revealed state.

## Files touched
- `src/contexts/HideNumbersContext.tsx` (strip persistence, simplify)
- `supabase/migrations/<new>.sql` (drop `employee_profiles.hide_numbers`)
- `mem://style/platform-ui-standards-and-privacy` (codify session-only contract)

## Out of scope (intentional)
- No change to `BlurredAmount` rendering, the `h` hotkey, the confirmation dialog, or the top-bar button — only the persistence layer is being removed.
- No change to the `AnimatedBlurredAmount` component.

## Verification after build
- Hard refresh → all `BlurredAmount` instances render blurred.
- Press `h` → values reveal instantly with no network call.
- Refresh tab → values are blurred again.
- Click a blurred value → confirmation dialog appears, reveal persists for this session only.