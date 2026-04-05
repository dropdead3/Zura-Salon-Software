

# Graduation System — Pass 4: Cross-Surface Integration + Level Display Mode

## Feedback Incorporated

The user correctly identified that custom level names (e.g., "New Talent," "Master Stylist") may be internal terminology not suitable for public-facing cards. Admins need a toggle to control whether the website shows **numbered labels** ("Level 1," "Level 2") or **custom names** from `client_label`. This setting will live in the existing `organizations.settings` JSONB column — no migration needed.

---

## All Changes

### 1. Website level display mode toggle (new)
- Add a `website_level_display_mode` field to `organizations.settings` JSONB: `'numbered'` (default) or `'custom_name'`
- Add a toggle in `EditStylistCardDialog` (or a website settings section) so admins can choose: "Show as Level 1, Level 2..." vs "Show as New Talent, Senior..."
- `StylistFlipCard` and `StylistsSection` resolve the display label based on this setting
- When `'numbered'`: show `client_label` as-is (e.g., "Level 1 Stylist")
- When `'custom_name'`: resolve from `stylist_levels.label` (e.g., "New Talent")

### 2. Add level color badges + graduation status to Team Directory
- Import `getLevelColor` from `@/lib/level-colors.ts`
- Replace plain text level display with colored badge
- For admin viewers, add subtle status dot (green = ready, amber = in progress, red = at risk)

### 3. Fix website stylist cards to use resolved labels
- `StylistsSection` reads the org's `website_level_display_mode` setting
- Passes the resolved label to `StylistFlipCard` based on mode
- Fallback to raw slug if no match

### 4. Replace hardcoded levels in EditStylistCardDialog
- Replace `STYLIST_LEVELS = ['LEVEL 1', 'LEVEL 2', 'LEVEL 3', 'LEVEL 4']` with dynamic levels from `useStylistLevels`
- Add a "Website level display" toggle (numbered vs custom names) in the dialog or a nearby settings surface

### 5. Fix ManagementHub graduation stat + description
- Replace vague "tracked" count with actionable stats from `useTeamLevelProgress`
- Update description to "Track team level progression and retention"

### 6. Add graduation awareness to Dashboard Home
- **Stylists**: Compact level progress nudge showing composite score and next-level proximity
- **Admins**: KPI tile showing "X ready to promote / Y at risk" linking to Graduation Tracker

### 7. Fix LeadAssignmentDialog to use shared level colors
- Replace local `getLevelColor` with import from `@/lib/level-colors.ts`

### 8. Update nav label to "My Level Progress"
- Rename both occurrences in `dashboardNav.ts`

---

## Technical Detail: Level Display Mode

The `organizations.settings` JSONB column already exists. We store:

```json
{ "website_level_display_mode": "numbered" }
```

Values: `"numbered"` (default — shows "Level 1", "Level 2") or `"custom_name"` (shows the `label` field from `stylist_levels`, e.g., "New Talent", "Senior").

This is read by the public website components and the edit dialog. No migration needed — just a JSONB key convention.

---

## File Changes

| File | Action |
|------|--------|
| `src/pages/dashboard/TeamDirectory.tsx` | **Modify** — Add level color badges and graduation status indicators |
| `src/components/home/StylistsSection.tsx` | **Modify** — Read display mode from org settings, resolve labels accordingly |
| `src/components/home/StylistFlipCard.tsx` | **Modify** — Accept resolved display label prop |
| `src/components/dashboard/EditStylistCardDialog.tsx` | **Modify** — Dynamic levels from DB, add website level display mode toggle |
| `src/pages/dashboard/admin/ManagementHub.tsx` | **Modify** — Fix graduation stat and description |
| `src/pages/dashboard/DashboardHome.tsx` | **Modify** — Add level progress nudge (stylist) and graduation KPI (admin) |
| `src/components/dashboard/leads/LeadAssignmentDialog.tsx` | **Modify** — Use shared `getLevelColor` |
| `src/config/dashboardNav.ts` | **Modify** — Rename "My Graduation" to "My Level Progress" |

**0 new files, 8 modified files, 0 migrations.**

