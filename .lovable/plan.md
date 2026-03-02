

## Rename "Team Hub" → "Operations Hub"

This is a label-only change across 7 files. The URL path (`/dashboard/admin/team-hub`) stays the same to avoid breaking bookmarks, redirects, and deep links. Only user-facing labels change.

### Files to modify

| File | Change |
|---|---|
| `src/locales/en.json` | `"team_hub": "Operations Hub"` |
| `src/config/dashboardNav.ts` | Update both `manageNavItems` and `hubLinksConfig` label strings from "Team Hub" → "Operations Hub" |
| `src/pages/dashboard/admin/TeamHub.tsx` | Page title and description: "Operations Hub" / "People management, development, and team operations" |
| `src/components/dashboard/settings/SidebarPreview.tsx` | Preview label map entry |
| `src/components/dashboard/TopBarSearch.tsx` | Comment label "Team Hub children" → "Operations Hub children" |
| `src/pages/dashboard/admin/ChairAssignments.tsx` | `backTo` label context (path stays same, but if there's a visible label referencing "Team Hub") |

No route changes. No schema changes. No new files.

