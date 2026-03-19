

# Inventory Manager Role — Current State & What's Needed

## What Exists Today

1. **Backroom Permissions Matrix** — Has an `inventory_manager` column with granular permissions (edit_inventory, perform_counts, receive_po, etc.), but this is a **soft label** stored in a JSON settings blob (`backroom_settings`), not an actual `app_role` enum value.

2. **Inventory Lead Assignment** — A `location_inventory_leads` table + `InventoryLeadAssignmentCard` lets orgs assign a specific person as the inventory lead per location. This is a designation, not a role.

3. **No `inventory_manager` in `app_role` enum** — The current enum has 11 values: `admin`, `manager`, `stylist`, `receptionist`, `assistant`, `stylist_assistant`, `admin_assistant`, `operations_assistant`, `super_admin`, `booth_renter`, `bookkeeper`. There is no dedicated inventory management role.

4. **No dashboard personalization** — The "Inventory Lead" badge is mentioned in UI copy but never actually rendered. No inventory-specific dashboard widgets surface for assigned leads.

## What Needs to Be Built

### 1. Add `inventory_manager` to `app_role` enum
- Migration: `ALTER TYPE app_role ADD VALUE 'inventory_manager'`
- This makes it a real assignable role in the Access Hub, invitable via the staff invite flow

### 2. Wire into role metadata
- Add `inventory_manager` to the `roles` DB table (name, label "Inventory Manager", description, icon `Package`, color `teal`, category `operations`)
- Grant default permissions: `manage_inventory`, `view_backroom`, `view_transactions`
- Add to `useInvitableRoles.ts` under `MANAGER_INVITABLE_ROLES`
- Add to `dashboard_element_visibility` defaults

### 3. Inventory Manager Dashboard Widget
- New component: `InventoryManagerDashboardCard.tsx` — a role-aware card on the main dashboard that shows:
  - Pending POs awaiting approval
  - Low stock alerts count
  - Next scheduled count date
  - Quick actions: "Receive PO", "Start Count", "View Reorder Queue"
- Only visible when user has `inventory_manager` role or is an assigned Inventory Lead

### 4. Surface backroom inventory access
- The Inventory Manager role should auto-grant access to:
  - `/dashboard/inventory` (retail)
  - Backroom Hub inventory tab (professional products)
  - Reorder queue and PO management
- Update `ProtectedRoute` permission checks and sidebar visibility

### 5. Notification routing
- Update `AlertsExceptionsSection` to include `inventory_manager` as a first-class notify target (already partially done — it's in `NOTIFY_ROLE_OPTIONS`)
- Wire Control Tower alerts to route to users with `inventory_manager` role

### 6. Inventory Lead → Role sync
- When someone is assigned as Inventory Lead for a location but doesn't have the `inventory_manager` role, show a prompt: "Assign Inventory Manager role to this person?"
- This bridges the existing Lead assignment with the new formal role

## Technical Summary

| Change | Type |
|--------|------|
| `ALTER TYPE app_role ADD VALUE 'inventory_manager'` | Migration |
| Insert into `roles` table (metadata) | Migration |
| Insert default `role_permissions` | Migration |
| Insert `dashboard_element_visibility` entries | Migration |
| `InventoryManagerDashboardCard.tsx` | New component |
| `useInvitableRoles.ts` | Edit |
| `BackroomPermissionsSection.tsx` | Already has it |
| `InventoryLeadAssignmentCard.tsx` | Edit (role sync prompt) |
| Sidebar/nav visibility for inventory routes | Edit |

## Files Modified (~8), New Files (1), Migrations (1)

