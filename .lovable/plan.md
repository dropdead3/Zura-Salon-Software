# Reset-to-Template Button Upgrade

The "Reset to Default" button **already exists** inside the Customize menu, but today it works by snapshotting the template into your `user_preferences` row. That means the moment you reset, you immediately drift away from any future template updates again — exactly the bug that hid the new owner sections from you.

This change makes Reset do what it should: **wipe your personal layout** so the dashboard falls through to the live `account_owner` template every time it loads.

## What changes for the user

- Inside Customize → "Reset to Default" button keeps its label and confirmation dialog.
- After confirming:
  - Your personal `dashboard_layout` row is **cleared** (set to `null`).
  - On next render, the dashboard resolves to the live owner template (with `daily_briefing`, `decisions_awaiting`, `team_pulse`, `upcoming_events`, etc.).
  - Any future template improvements appear automatically — no second reset needed.
- Toast: "Dashboard restored to the latest template".

## Technical changes

**1. `src/hooks/useResetToDefault` — three branches**

Rewrite the mutation in `src/hooks/useDashboardLayout.ts` (~lines 605–651):

| Caller | Action | Why |
|---|---|---|
| Owner previewing a role (`isViewingAs`) | DELETE row in `dashboard_role_layouts` for that role | Fall through to seeded template (already today's behavior — preserved) |
| **Owner on own canvas (new)** | `UPDATE user_preferences SET dashboard_layout = NULL` | True fall-through to live owner template — no template snapshotting |
| Non-owners / impersonation targets | Write template snapshot to `user_preferences` (legacy) | They have no template fall-through to lean on |

Also: optimistically clear the React Query cache (`['user-preferences', targetId]`) on success so the dashboard re-renders without a second fetch.

**2. No UI changes needed**

The existing "Reset to Default" button (`DashboardCustomizeMenu.tsx` lines 855–880) already calls `resetToDefault.mutate()`. Once the hook behavior is upgraded, the button does the right thing.

## What stays the same

- Button location, icon, confirmation copy.
- `useSaveDashboardLayout` behavior for normal edits — unchanged.
- Org-role-layout reset for "preview-as-role" mode — unchanged.

## Verification

1. As account owner, open Customize → click "Reset to Default" → confirm.
2. Toast: "Dashboard restored to the latest template".
3. Dashboard re-renders with the new owner sections in canonical order:
   `daily_briefing → ai_insights → decisions_awaiting → hub_quicklinks → … → team_pulse → upcoming_events → schedule_tasks → announcements → widgets`.
4. Re-open Customize: section order matches the seeded `account_owner` template.
5. (DB sanity) `SELECT dashboard_layout FROM user_preferences WHERE user_id = '<owner>'` returns `null`.

## Out of scope (explicitly)

- No "stale layout" banner on the dashboard. Keeping scope to the button.
- No backfill of existing personal layouts — owners get the new template on demand by clicking Reset.
- No changes to the Customize menu UI itself.
