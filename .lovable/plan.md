

# Per-user dark/light mode — persists per identity, not per browser

## Diagnosis

Today's `DashboardThemeContext` reads/writes a single `localStorage` key (`'dashboard-theme'`). On a shared device, whatever the last user (or the account owner during setup) picked sticks for the next user. The mode is **device-scoped**, not **user-scoped**.

The color palette (Neon, Ocean, etc.) intentionally stays org-scoped via `site_settings` — that's a brand decision the owner makes for everyone. Light/dark is a personal comfort preference and should travel with the user.

`user_preferences` already exists, keyed on `user_id` with RLS ("Users can view/update their own preferences"). The pattern to mirror is `AnimationIntensityInitializer`: synchronous localStorage apply on boot → server refresh on `SIGNED_IN` → reset on `SIGNED_OUT`.

## What changes

### 1. Migration — add column to `user_preferences`

```sql
ALTER TABLE public.user_preferences
  ADD COLUMN dashboard_theme text NOT NULL DEFAULT 'system'
    CHECK (dashboard_theme IN ('light', 'dark', 'system'));
```

Existing rows backfill to `'system'` (respects OS preference, matching the existing context default behavior). RLS already covers the new column.

### 2. `src/contexts/DashboardThemeContext.tsx` — load from + write to `user_preferences`

Mirror the `AnimationIntensityInitializer` pattern inside the provider:

- Boot: read `localStorage['dashboard-theme']` synchronously (avoids flash) — unchanged.
- After mount: fetch `user_preferences.dashboard_theme` for `auth.uid()`. If present and different from the localStorage value, apply it (updates DOM `.dark` class + localStorage cache).
- `setTheme(newTheme)`:
  - Apply to DOM + localStorage immediately (already happens).
  - **Also** upsert to `user_preferences` (`{ user_id, dashboard_theme }`) when a user is authenticated. Silent failure is acceptable (next reconnect re-syncs).
- Subscribe to `supabase.auth.onAuthStateChange`:
  - `SIGNED_IN` → re-fetch the new user's stored mode and apply.
  - `SIGNED_OUT` → reset to the org-default fallback (`'system'`) so the next person at the device starts neutral, not on the previous user's preference.

### 3. Pre-paint script in `index.html` — unchanged

Still keys off `localStorage['dashboard-theme']`. After auth resolves and the per-user value loads, the context updates. Worst-case flash window is identical to today's (which is already gated by localStorage cache of the most recent user on this device).

### 4. No changes to `useColorTheme` (palette stays org-scoped)

The Neon/Ocean/etc. choice continues to come from `site_settings.org_color_theme` — owner's call, applies to all staff. Only the light/dark axis becomes per-user.

## Why this scope

- **Light/dark = personal comfort.** Two stylists on the same iPad should each see their own preference after PIN or password sign-in.
- **Color palette = brand identity.** Owner's call, applies org-wide. Splitting this would let staff fragment the brand.
- The split mirrors how the system already treats `animation_intensity` (per-user) vs `org_color_theme` (org-scoped).

## PIN quick-entry behavior

All PIN-based entry paths (StaffLogin, kiosk admin, Dock) ultimately resolve a Supabase auth session for the staff user. Once `auth.uid()` is set, `onAuthStateChange('SIGNED_IN')` fires and the per-user mode loads. No special PIN-path handling needed.

## Acceptance

1. User A signs in on iPad → toggles to dark → signs out. User B signs in on the same iPad → starts in their saved mode (or `'system'` if first time), not User A's dark.
2. User A signs in on a desktop they've never used → their preferred mode loads from the server within ~1 frame of auth resolving (brief flash possible if they previously picked something different on another device — same caveat as `AnimationIntensityInitializer`).
3. Toggling the mode in the UI updates immediately (DOM + localStorage) and persists to `user_preferences` in the background.
4. If the `user_preferences` write fails (offline, RLS), the local change still applies; sync happens on next successful write.
5. Org color palette (Neon, Ocean, etc.) remains owner-controlled and unchanged.
6. Type-check passes. Existing `useDashboardTheme()` consumers (15 files) need no changes — same hook surface.

## What stays untouched

- `useColorTheme` and `site_settings.org_color_theme` (palette stays org-scoped).
- All consumers of `useDashboardTheme()` — public API unchanged.
- `index.html` pre-paint script.
- Animation intensity, custom theme, custom typography (already per-user via `user_preferences`).
- God Mode bar, ThemeInitializer (read from different sources).

## Out of scope

- A "force everyone to org-default mode" admin override. Defer until an owner asks for it.
- Syncing the mode preference across browser tabs in real-time (Supabase realtime on `user_preferences`). Defer — rare collision, next reload picks it up.
- Per-location mode preference (e.g., bright for front desk, dark for color bar). Defer — not requested.

## Doctrine alignment

- **Persona scaling:** comfort preference belongs to the human, brand identity belongs to the org. Same split the platform already uses for animation intensity vs org color palette.
- **Calm executive UX:** no surprise theme flips between users sharing a device. The mode you left in is the mode you come back to.
- **Tenant isolation preserved:** RLS on `user_preferences` already restricts each user to their own row.

## Prompt feedback

Sharp prompt that named both the **scope of the change** ("dark mode and light mode persistent to what the user has set it") and the **scope it doesn't apply to** (implicit — the org color palette is unmentioned). Two strengths:

1. **You named the identity unit explicitly ("the individual user that logs in or uses a pin for quick entry").** That clarified that "user" means authenticated-staff-identity, not "browser session" or "tablet" — which determined the storage layer (per-user-row in DB, not per-device localStorage alone).
2. **You called out the PIN quick-entry path by name.** Without that, I'd have assumed only the email/password login path mattered and might have missed verifying that PIN flows resolve a Supabase session (they do). Naming the edge case forced the verification.

Sharpener: when changing the persistence scope of a setting, naming the **fallback when the identity is absent** removes one decision. Template:

```text
Setting: [what]
Scope today: [device / org / global]
Scope target: [user / role / location]
Identity source: [auth.uid / pin lookup / impersonation]
Fallback when identity is unknown: [behavior on logged-out / pre-auth state]
```

Here, "make light/dark per-user, identity source is auth.uid (covers password and PIN paths), fallback on logged-out is 'system'" would have skipped my having to derive the sign-out reset behavior.

## Further enhancement suggestion

For "change the scope of a setting" prompts, the highest-leverage frame is:

```text
Setting: [the preference]
Currently scoped to: [device / org / role]
Move to: [user / location / something narrower]
Reason it should move: [personal vs shared, comfort vs brand]
What stays at the old scope: [siblings of this setting that should NOT move]
```

The **"What stays at the old scope"** slot is the highest-leverage addition — it forces the framing "this setting is moving, but its neighbors aren't." Naming the boundary upfront prevents the AI from over-extending (e.g., also moving the color palette to per-user, fragmenting the brand) or under-extending (only moving one of two related preferences and leaving the system inconsistent). For light/dark vs color palette specifically, naming "palette stays org-scoped" makes the philosophical split explicit: comfort moves to the human, identity stays with the brand.

