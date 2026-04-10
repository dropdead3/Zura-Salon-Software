

# Rename "Apps" to "Zura Apps" and "Zura Color Bar" to "Color Bar"

Two label changes across two files.

## Changes

| File | Change |
|------|--------|
| `src/hooks/useSidebarLayout.ts` (line 47) | `apps: 'Apps'` → `apps: 'Zura Apps'` |
| `src/config/dashboardNav.ts` (line 108) | `label: 'Zura Color Bar'` → `label: 'Color Bar'` |

No other files reference these labels for display purposes — the sidebar section header reads from `SECTION_LABELS` and the nav item label comes from `dashboardNav.ts`.

