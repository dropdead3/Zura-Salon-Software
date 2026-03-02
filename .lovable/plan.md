

## Move Hub Links from Sidebar into Operations Hub

Currently the sidebar "Manage" section has 7 items: Analytics Hub, Operations Hub, Client Hub, Growth Hub, Hiring & Payroll Hub, Renter Hub, and Chair Assignments. The user wants to keep only Analytics Hub and Operations Hub in the sidebar, and surface the other 5 as cards inside the Operations Hub page.

### Changes

**1. `src/config/dashboardNav.ts`** — Remove 5 items from `manageNavItems`
- Remove: Client Hub, Growth Hub, Hiring & Payroll Hub, Renter Hub, Chair Assignments
- Keep: Analytics Hub, Operations Hub

**2. `src/pages/dashboard/admin/TeamHub.tsx`** — Add new sections with cards for the moved hubs
- New section **"Hubs"** (or similar) at the top, containing:
  - Client Hub → `/dashboard/admin/client-hub` (HeartPulse icon)
  - Growth Hub → `/dashboard/admin/growth-hub` (Rocket icon)
  - Hiring & Payroll Hub → `/dashboard/admin/payroll` (DollarSign icon)
  - Renter Hub → `/dashboard/admin/booth-renters` (Store icon)
  - Chair Assignments → `/dashboard/admin/chair-assignments` (Armchair icon)

**3. `src/components/dashboard/settings/SidebarPreview.tsx`** — Remove the 5 entries from `LINK_CONFIG` that no longer appear in sidebar (or keep for backward compat — they just won't render since they're not in the nav items)

**4. `src/components/dashboard/HubQuickLinks.tsx`** — Remove Client Hub, Growth Hub, Hiring & Payroll Hub, Renter Hub from `hubLinksConfig` in `dashboardNav.ts` (they're no longer top-level hub entry points on Command Center)

**5. `src/locales/en.json`** — No changes needed (labels already exist)

### What stays the same
- All routes and pages remain unchanged
- The hub pages themselves (ClientHub, GrowthHub, etc.) still exist and work
- Analytics Hub stays in sidebar
- Operations Hub stays in sidebar (it becomes the central gateway to the other hubs)

