

## Rename "Backroom" → "Color Bar" Across Entire Codebase

### Scope Summary
285 files contain "Backroom" or "backroom" references. This rename touches folders, file names, hook names, variable names, import paths, UI strings, comments, route paths, and nav labels.

**Not renamed** (would require DB migrations and break existing data):
- Database table names (`backroom_settings`, `staff_backroom_performance`, etc.)
- Database column names (`is_backroom_tracked`)
- Supabase RPC function names
- Setting keys stored in DB (`dock_assistant_prep_enabled` etc. — these don't contain "backroom")

### Phase 1 — Folder & File Renames

| Current Path | New Path |
|---|---|
| `src/lib/backroom/` | `src/lib/color-bar/` |
| `src/hooks/backroom/` | `src/hooks/color-bar/` |
| `src/components/dashboard/backroom-settings/` | `src/components/dashboard/color-bar-settings/` |
| `src/components/platform/backroom/` | `src/components/platform/color-bar/` |
| `src/pages/dashboard/admin/BackroomSettings.tsx` | `src/pages/dashboard/admin/ColorBarSettings.tsx` |
| `src/pages/dashboard/platform/BackroomAdmin.tsx` | `src/pages/dashboard/platform/ColorBarAdmin.tsx` |

### Phase 2 — Import Path Updates (~200+ files)

Every file importing from `@/lib/backroom/`, `@/hooks/backroom/`, or `@/components/dashboard/backroom-settings/` gets updated import paths. Example:
```ts
// Before
import { supabase } from '@/lib/backroom/services/formula-service';
// After
import { supabase } from '@/lib/color-bar/services/formula-service';
```

### Phase 3 — Identifier Renames

Hooks, functions, variables, interfaces, and types containing "backroom" or "Backroom":
- `useBackroomSetting` → `useColorBarSetting`
- `useBackroomOrgId` → `useColorBarOrgId`
- `useBackroomSavings` → `useColorBarSavings`
- `useBackroomPricingEstimate` → `useColorBarPricingEstimate`
- `useStaffBackroomPerformance` → `useStaffColorBarPerformance`
- `BackroomSavingsSection` → `ColorBarSavingsSection`
- `BackroomSetupWizard` → `ColorBarSetupWizard`
- `BackroomSetupBanner` → `ColorBarSetupBanner`
- `BackroomAnalyticsSection` → `ColorBarAnalyticsSection`
- `BackroomOverviewSection` → `ColorBarOverviewSection`
- (and ~50+ more identifiers following the same pattern)

### Phase 4 — User-Facing Strings

All display text updated:
- `"Zura Backroom"` → `"Zura Color Bar"`
- `"Backroom Hub"` → `"Color Bar Hub"`
- `"backroom sessions"` → `"color bar sessions"`
- `"backroom tracking"` → `"color bar tracking"`
- Nav label: `"Zura Backroom"` → `"Zura Color Bar"` (in `dashboardNav.ts`, `SidebarPreview.tsx`)
- Tooltips, descriptions, comments — all instances

### Phase 5 — Route Paths

| Current | New |
|---|---|
| `/dashboard/admin/backroom-settings` | `/dashboard/admin/color-bar-settings` |
| Platform admin routes with "backroom" | Updated similarly |

Router config, nav items, and all `href`/`navigate()` references updated.

### Phase 6 — Comment Headers

All file-level doc comments like `/** Zura Backroom — ... */` updated to `/** Zura Color Bar — ... */`.

### What Stays Unchanged
- **Database tables**: `backroom_settings`, `staff_backroom_performance`, `checkout_usage_projections` — these are DB-level and renaming requires migrations + risks data loss
- **DB column names**: `is_backroom_tracked` etc. — referenced in queries but aliased in code
- **Query keys**: Will be updated in code (e.g., `'backroom-pricing-estimate'` → `'color-bar-pricing-estimate'`)

### Execution Strategy
Due to the massive scope (~285 files), this will be executed in batches:
1. Create new folders + move/rename files
2. Bulk update imports across all consumers
3. Rename identifiers within each file
4. Update strings and comments
5. Update routes and navigation

### Risk
- High file count but mechanical rename — no logic changes
- DB table names remain as-is to avoid migration risk

