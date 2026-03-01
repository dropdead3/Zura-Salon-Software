

## Consolidate Admin Navigation into Domain Hubs

### Problem
The sidebar currently lists 22+ individual links under the Management section (across 4 sub-groups), plus items scattered across Growth, Stats, and Admin sections. This creates a long, scrollable nav that feels like a feature warehouse.

### Solution
Reduce the sidebar to **hub entry points only** for admin/management functions. Each hub is an existing or new landing page that organizes its children into categorized card grids (like Management Hub already does). The sidebar stays clean; the hubs provide full access.

### Proposed Sidebar Structure

```text
LOCKED (unchanged):
  Command Center
  Schedule
  Team Chat

SECTION: "My Tools" (replaces growth + stats, staff-facing)
  Today's Prep          (stylist only)
  Waitlist              (admin/receptionist only)
  My Stats
  My Pay
  Training
  New-Client Engine     (stylist only)
  Shift Swaps
  Rewards

SECTION: "Manage" (admin/manager, hub-only links)
  Analytics Hub         → existing hub page
  Team Hub              → NEW hub (consolidates: Directory, Meetings, Program Team, 
                           Onboarding Tracker, Graduation Tracker, Client Engine Tracker,
                           Training Hub, Challenges, Performance Reviews, Strikes, 
                           Documents, Incidents, PTO, Schedule Requests, Assistant Requests,
                           Birthdays, Business Cards, Headshots, Daily Huddle, Announcements,
                           Shift Swap Approvals)
  Client Hub            → NEW hub (consolidates: Client Directory, Client Health, 
                           Feedback, Re-engagement, Merge Clients)
  Growth Hub            → NEW hub (consolidates: Campaigns, Website Editor, SEO Workshop)
  Hiring & Payroll Hub  → existing hub page (Recruiting, Leads, Payroll, New Hire Wizard)
  Renter Hub            → existing hub page (Booth Renters, Booth Rental, Renter Onboard)

SECTION: "System" (admin only)
  Roles & Controls Hub
  Settings
```

This reduces ~22 sidebar links in Management to **6 hub links**, plus keeps ~8 staff-facing links in "My Tools".

### Implementation

**1. Create Team Hub page** (`src/pages/dashboard/admin/TeamHub.tsx`)
- Reuses `ManagementCard` + `CategorySection` pattern from ManagementHub
- Groups: Team Development, Scheduling & Requests, Performance & Compliance, PTO & Leave, Team Operations, Communications, AI & Automation, Points & Rewards
- Essentially the existing ManagementHub minus Marketing, Client Experience, and Recruiting sections

**2. Create Client Hub page** (`src/pages/dashboard/admin/ClientHub.tsx`)
- Groups: Client Directory, Client Health, Feedback & Reviews, Re-engagement, Merge Clients

**3. Create Growth Hub page** (`src/pages/dashboard/admin/GrowthHub.tsx`)
- Groups: Campaigns, Website Editor, SEO Workshop
- Could expand to include marketing analytics subtab links

**4. Update `dashboardNav.ts`**
- Replace `growthNavItems` with staff-only items (Training, New-Client Engine, Ring the Bell, My Graduation)
- Replace `statsNavItems` content to merge into a new "My Tools" section
- Replace `managerNavItems` (22 items) with 6 hub links only
- Add routes for new hub pages

**5. Update `useSidebarLayout.ts`**
- New section IDs: `myTools`, `manage`, `system` (replacing `growth`, `stats`, `manager`, `adminOnly`)
- Update `SECTION_LABELS`, `DEFAULT_SECTION_ORDER`, `DEFAULT_LINK_ORDER`
- Remove `MANAGEMENT_SUB_GROUPS` (no longer needed — no sub-groups in sidebar)

**6. Update `SidebarNavContent.tsx`**
- Remove `CollapsibleNavGroup` rendering for manager section (now just flat hub links)
- Update `sectionItemsMap` for new section IDs

**7. Update `App.tsx`**
- Add routes: `/dashboard/admin/team-hub`, `/dashboard/admin/client-hub`, `/dashboard/admin/growth-hub`

**8. Update `SidebarPreview.tsx`**
- Update `LINK_CONFIG` for new hub routes

**9. DB migration consideration**
- Organizations with stored `sidebar_layout` referencing old section IDs need graceful fallback (already handled by the merge logic in `useSidebarLayout`)

### What moves where

| Old Sidebar Location | New Location | Access Path |
|---|---|---|
| Team Directory | Team Hub card | Manage → Team Hub → Team Directory |
| Client Directory | Client Hub card | Manage → Client Hub → Client Directory |
| Meetings & Accountability | Team Hub card | Manage → Team Hub → Meetings |
| Program Team Overview | Team Hub card | Manage → Team Hub → Program Team |
| Campaigns | Growth Hub card | Manage → Growth Hub → Campaigns |
| Website Editor | Growth Hub card | Manage → Growth Hub → Website Editor |
| SEO Workshop | Growth Hub card | Manage → Growth Hub → SEO Workshop |
| Appointments & Txns | Analytics Hub (already a tab) | Manage → Analytics Hub |
| KPI Architecture | Analytics Hub card | Manage → Analytics Hub |
| Decision History | Analytics Hub card | Manage → Analytics Hub |
| Team Stats / Leaderboard | Analytics Hub | Manage → Analytics Hub |
| Inventory | Team Hub card (Operations) | Manage → Team Hub → Inventory |
| Management Hub | Replaced by Team Hub | Manage → Team Hub |
| Booth Rental | Renter Hub | Manage → Renter Hub |
| Assistant Scheduling | Team Hub card | Manage → Team Hub |

### Cognitive load reduction
- Sidebar scan from ~30 items to ~16 items (including section headers)
- Admin section: 22 → 6 links (each a clear domain hub)
- Zero features removed — every page stays accessible, just organized behind domain hubs
- Hubs are searchable via TopBarSearch (existing)

