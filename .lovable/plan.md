

## Implement All 5 Post-Consolidation Enhancements

### 1. Fix TopBarSearch hub children discovery

**File:** `src/components/dashboard/TopBarSearch.tsx`

- Replace imports of `growthNavItems`, `statsNavItems`, `managerNavItems`, `adminOnlyNavItems` with `myToolsNavItems`, `manageNavItems`, `systemNavItems`
- Add a `hubChildrenItems` array (~35 items) containing all deep pages inside Team Hub, Client Hub, Growth Hub, and Hiring/Payroll Hub (e.g., Team Directory, Performance Reviews, PTO Balances, Campaigns, Client Health, Recruiting Pipeline, etc.)
- Update the `navigationResults` useMemo to include `hubChildrenItems` in the deduped list

### 2. Redirect legacy ManagementHub route

**File:** `src/App.tsx`

- Replace the ManagementHub route at line 322:
  ```
  // Before:
  <Route path="/dashboard/admin/management" element={<ProtectedRoute ...><ManagementHub /></ProtectedRoute>} />
  // After:
  <Route path="/dashboard/admin/management" element={<Navigate to="/dashboard/admin/team-hub" replace />} />
  ```
- The ManagementHub import can remain (dead code) or be removed for cleanliness

### 3. Clean up HubQuickLinks config

**File:** `src/config/dashboardNav.ts`

- Remove standalone non-hub items from `hubLinksConfig`: "Schedule 1:1" and "Appointments & Transactions"
- These are individual pages, not hub entry points — they're already accessible via Team Hub and Analytics Hub respectively

### 4. Update SidebarPreview link config

**File:** `src/components/dashboard/settings/SidebarPreview.tsx`

- Remove legacy standalone links from `LINK_CONFIG` that are no longer in the sidebar (Team Directory, Client Directory, Appointments & Transactions, etc.)
- Add the new hub routes: `/dashboard/admin/team-hub`, `/dashboard/admin/client-hub`, `/dashboard/admin/growth-hub`
- Keep existing hub entries (Analytics Hub, Payroll Hub, Renter Hub)

### 5. Add mobile admin nav shortcut

**File:** `src/components/mobile/layout/MobileBottomNav.tsx`

- Import `useAuth` from `@/contexts/AuthContext`
- Add `LayoutGrid` icon from lucide-react
- Conditionally include a "Manage" nav item (linking to `/dashboard/admin/team-hub`) when the user has the `view_team_overview` permission
- This replaces the "Stats" item for admin users, or is added as a 6th item (5 items is the max comfortable for mobile, so replacing Stats — which is still accessible from sidebar — is better)

### Files Modified

| File | Change |
|---|---|
| `src/components/dashboard/TopBarSearch.tsx` | Fix imports, add hub children searchable items |
| `src/App.tsx` | Replace ManagementHub route with redirect |
| `src/config/dashboardNav.ts` | Remove non-hub items from hubLinksConfig |
| `src/components/dashboard/settings/SidebarPreview.tsx` | Update LINK_CONFIG for new hub structure |
| `src/components/mobile/layout/MobileBottomNav.tsx` | Add role-conditional Manage shortcut |

