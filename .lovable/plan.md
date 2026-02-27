

## Clean Up the Navigation Bar and Fix Sidebar Labels

Two distinct issues are visible:

### Issue 1: Broken Sidebar Labels
The sidebar shows raw i18n keys ("nav.todays_prep", "nav.waitlist") because those translation keys are missing from `src/locales/en.json`. The `dashboardNav.ts` defines `labelKey: 'todays_prep'` and `labelKey: 'waitlist'` but the i18n file has no entries for them.

**Fix — `src/locales/en.json`**
Add the missing keys under `dashboard.nav`:
```json
"todays_prep": "Today's Prep",
"waitlist": "Waitlist",
```

Also audit for any other missing `labelKey` values (e.g. `booth_rental`, `inventory`).

---

### Issue 2: Cluttered Top Bar — Too Many Role Badges
The top bar currently renders up to 3 simultaneous role badges (Account Owner + Super Admin + Stylist), each as a visible pill. Combined with View As, Show/hide $, Theme toggle, Notifications, and Avatar, this overloads the right zone.

**Fix — Consolidate role badges to show only the highest-priority badge**

In `src/components/dashboard/SuperAdminTopBar.tsx`:
- Instead of rendering `roleBadges.map(...)` (all badges), render only `roleBadges[0]` — the highest-priority badge (already sorted by `order`).
- Move the full role list into the avatar dropdown menu as a "Roles" section so users can still see all their roles without cluttering the bar.

**Changes in `SuperAdminTopBar.tsx` (~line 210-233):**
- Replace the `.map()` over all badges with a single render of `roleBadges[0]`
- In the `<DropdownMenuContent>` for the avatar (~line 260), add a section showing all role badges as small labels

This reduces the right zone from 3 badge pills to 1, immediately decluttering the bar while preserving role visibility in the avatar menu.

---

### Summary of Files

| File | Change |
|------|--------|
| `src/locales/en.json` | Add missing `todays_prep`, `waitlist` + any other missing nav keys |
| `src/components/dashboard/SuperAdminTopBar.tsx` | Show only primary role badge; move full role list to avatar dropdown |

