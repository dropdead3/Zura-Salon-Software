

## Two New Dock Features: Team Compliance (Admin-Locked) + Personal Stylist Analytics

### Overview

1. **Team Member Compliance** — A new section in the Dock Settings tab, locked behind an admin/manager PIN re-auth gate. Shows org-wide staff compliance metrics (reweigh rates, overages, waste, manual overrides) so managers don't need to switch to the full dashboard.

2. **My Performance** — A personal analytics view for the logged-in stylist, visible in their own Dock experience (no PIN gate needed — it's their own data). Shows their reweigh compliance, waste rate, overage history, and mixing trends.

---

### 1. Team Member Compliance (Admin-Locked)

**New file: `src/components/dock/settings/DockTeamCompliancePanel.tsx`**

- A full-height panel that renders inside the Settings tab when unlocked
- **PIN gate**: Reuses the existing numpad UI pattern from `DockPinGate`. On tap of "Team Compliance" card, shows a mini PIN overlay. Validates the entered PIN via the existing `validate_user_pin` RPC, then checks if the returned user has `is_super_admin`, `is_primary_owner`, or an `admin`/`manager` role in `user_roles`. If not authorized, shows "Admin PIN required" error.
- **Data**: Fetches from `useBackroomAnalytics` and `useBackroomStaffMetrics` scoped to the Dock's `organizationId` and `locationId` for the last 30 days
- **UI contents**:
  - KPI strip: Reweigh Compliance %, Avg Waste %, Manual Override count, Total Sessions
  - Staff leaderboard table: Name, Sessions, Reweigh %, Waste %, Overage (sorted by compliance)
  - Each row tappable for a mini drill-down (optional future enhancement)
- **Back button** returns to the normal settings view

**Modified file: `src/components/dock/settings/DockSettingsTab.tsx`**

- Add a new "Team Compliance" card (with `ShieldCheck` icon) between the Station Location module and the logout button
- Card shows a lock icon and "Admin PIN required" subtitle
- On tap, shows the PIN gate overlay → unlocks the compliance panel
- State: `complianceUnlocked: boolean` + `showCompliancePin: boolean`

### 2. Personal Stylist Analytics ("My Stats")

**New file: `src/components/dock/settings/DockMyStatsPanel.tsx`**

- Always accessible in Settings (no PIN gate) — it's the logged-in user's own data
- Fetches from `useBackroomStaffMetrics` filtered to `staff.userId` for last 30 days
- Also fetches from `useStaffBackroomPerformance` for the same user/period
- **UI contents**:
  - Header: "My Performance · Last 30 Days"
  - Stat cards: Reweigh Compliance %, Waste Rate %, Avg Cost/Service, Total Sessions
  - If data exists: mini bar/progress indicators for each stat
  - If no data: "No mixing activity in the last 30 days" empty state

**Modified file: `src/components/dock/settings/DockSettingsTab.tsx`**

- Add a "My Stats" card (with `BarChart3` icon) below the staff profile card
- On tap, navigates to the stats panel (same pattern as compliance — inline panel swap)

### 3. Settings Tab Layout (updated order)

```text
┌─────────────────────────┐
│  Staff Profile Card     │
├─────────────────────────┤
│  📊 My Stats            │  ← tap → DockMyStatsPanel
├─────────────────────────┤
│  🛡 Team Compliance     │  ← tap → PIN gate → DockTeamCompliancePanel
│  Admin PIN required     │
├─────────────────────────┤
│  📍 Station Location    │
│  Move to Another...     │
├─────────────────────────┤
│        (spacer)         │
├─────────────────────────┤
│  🔴 Lock Station        │
└─────────────────────────┘
```

### Technical Details

- **No schema changes** — all data comes from existing tables (`mix_sessions`, `mix_bowls`, `backroom_analytics_snapshots`, `staff_backroom_performance`)
- **No new hooks** — reuses `useBackroomAnalytics`, `useBackroomStaffMetrics`, `useStaffBackroomPerformance`
- **Context workaround**: The Dock doesn't use `OrganizationContext`. The new hooks will receive `orgId` and `locationId` directly from `staff.organizationId` / `staff.locationId` via a lightweight wrapper or direct supabase queries
- **PIN validation for admin gate**: Uses existing `validate_user_pin` RPC with the Dock's bound `organizationId`, then checks role via a follow-up query to `user_roles`
- **3 new files**, 1 modified file

