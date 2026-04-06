

# Items 4–7: Commission Economics, Location Groups UI, Audit Trail, Stylist Roadmap

## Item 4 — Commission Economics Tab

**What it does**: An interactive margin calculator inside the Stylist Levels Editor that answers "can I afford this commission rate at each level?"

**Implementation**:
- New `CommissionEconomicsTab.tsx` component rendered as an "Economics" tab in `StylistLevelsEditor.tsx` (between "Location Overrides" and "Team Roster")
- New `useCommissionEconomics.ts` hook that:
  - Reads/writes three assumptions to `backroom_settings` (key-value store, already exists): `commission_target_margin_pct`, `commission_overhead_per_stylist`, `commission_product_cost_pct`
  - Queries trailing 90-day average revenue per stylist grouped by their assigned level from appointment data
- Per-level table columns: Level name, Service commission %, Retail commission %, Breakeven revenue, Target revenue, Actual avg revenue, Margin at actual, Status (Green/Yellow/Red)
- Math: `Revenue needed = Overhead / (1 - commission_rate - product_cost_pct - target_margin_pct)`
- "What If" slider panel (collapsible) — drag commission rate per level, see breakeven/target update in real-time
- All monetary values wrapped in `BlurredAmount`

| File | Change |
|------|--------|
| `src/components/dashboard/settings/CommissionEconomicsTab.tsx` | **New** — Calculator UI |
| `src/hooks/useCommissionEconomics.ts` | **New** — Assumptions CRUD + revenue-per-level query |
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | Add "Economics" TabsTrigger + TabsContent |

---

## Item 5 — Location Groups Management UI

**What it does**: Admin UI to create/rename/reorder/delete location groups and assign locations to them.

**Implementation**:
- Add a "Groups" tab to `LocationsSettingsContent.tsx` (the existing component already uses Tabs)
- Groups list with inline edit for name, drag-to-reorder (display_order), delete with confirmation
- Each group shows its assigned locations as chips; unassigned locations shown in a separate "Ungrouped" section
- Dropdown on each location card to assign/reassign to a group
- Uses existing `useLocationGroups`, `useCreateLocationGroup`, `useUpdateLocationGroup`, `useDeleteLocationGroup`, `useAssignLocationToGroup` hooks (all already built)

| File | Change |
|------|--------|
| `src/components/dashboard/settings/LocationsSettingsContent.tsx` | Add "Groups" tab with CRUD UI |

---

## Item 6 — Audit Trail for Commission Rate Changes

**What it does**: Logs to `platform_audit_log` whenever commission rates on `stylist_levels` are saved.

**Implementation**:
- In `useSaveStylistLevels` mutation's `onSuccess`, compare old vs new commission rates
- For each level where `service_commission_rate` or `retail_commission_rate` changed, insert a `platform_audit_log` entry via the existing `useLogPlatformAction` pattern
- Action type: `commission_rate_updated`, entity_type: `stylist_level`, details include `{ level_slug, old_service_rate, new_service_rate, old_retail_rate, new_retail_rate }`
- Add `commission_rate_updated` to `AUDIT_ACTION_CONFIG` in `usePlatformAuditLog.ts`

| File | Change |
|------|--------|
| `src/hooks/useStylistLevels.ts` | Add audit logging in save mutation |
| `src/hooks/usePlatformAuditLog.ts` | Add `commission_rate_updated` to config map |

---

## Item 7 — Stylist-Facing Level Roadmap

**What it does**: A "My Progression Ladder" card on the existing `MyGraduation` page showing the full level hierarchy with the stylist's current position highlighted and next-level criteria + commission rewards visible.

**Implementation**:
- New `LevelProgressionLadder.tsx` component — a vertical timeline/ladder rendering all active levels from `useStylistLevels`
- Current level highlighted with accent border + "You are here" badge
- Each level shows: commission rates (blurred), key promotion criteria thresholds for the next level
- Levels above current show criteria needed; levels below show as completed checkmarks
- Placed on `MyGraduation.tsx` between the `StylistScorecard` and the retention warning card
- Read-only — no editing, just visibility into "what am I working toward"

| File | Change |
|------|--------|
| `src/components/dashboard/LevelProgressionLadder.tsx` | **New** — Visual level ladder |
| `src/pages/dashboard/MyGraduation.tsx` | Import and render ladder after scorecard |

---

## Summary

| # | Item | Files | New |
|---|------|-------|-----|
| 4 | Commission Economics Tab | 3 | 2 new |
| 5 | Location Groups UI | 1 | 0 |
| 6 | Audit trail | 2 | 0 |
| 7 | Stylist roadmap | 2 | 1 new |

**8 files total. 3 new components. No database changes** — all tables and hooks already exist.

