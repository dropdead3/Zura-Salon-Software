

## Add Stylist Badge Tooltip in Three Locations

Three surfaces render the stylist badge for admin-who-also-performs-services. All three need the explanatory tooltip.

### 1. Top Bar — `src/components/dashboard/SuperAdminTopBar.tsx` (lines 208-228)

The top bar already wraps every role badge in a `Tooltip`, but the content just shows the label (and is hidden at `xl+`). For the stylist badge when `isAdmin` is true, change the tooltip content to the explanatory text and remove the `xl:hidden` restriction so it always shows.

**Detection:** `badge.label === 'Stylist' && isAdmin` (both props already available)

### 2. Card View — `src/components/access-hub/UserRolesTab.tsx` (lines 326-339)

The card view renders stylist badges without any tooltip. Wrap the stylist badge in a `Tooltip` when the user also has an admin-level role (`super_admin`, `admin`, or `manager` in `user.roles`).

### 3. Table View — `src/components/access-hub/UserRolesTableView.tsx` (lines 180-200)

Already implemented. Will verify it functions correctly after deploying changes to the other two locations.

### Tooltip Text (all three locations)

> "This user is an admin who also performs services. Managed via the 'I also perform services' toggle in Profile Settings."

