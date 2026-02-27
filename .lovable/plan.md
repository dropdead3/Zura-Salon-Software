

## Add Hover Tooltip to Stylist Badge for Admin Service Providers

**File:** `src/components/access-hub/UserRolesTableView.tsx`, lines ~180-189

**What changes:**
Wrap the role badge in a `Tooltip` when the role is `stylist` and the user also holds an admin-level role (`super_admin`, `admin`, or `manager`). The tooltip text:

> *"This user is an admin who also performs services. This role is managed via the 'I also perform services' toggle in Profile Settings."*

**Implementation:**
1. Import `Tooltip`, `TooltipTrigger`, `TooltipContent` from `@/components/ui/tooltip`
2. In the role badge mapping (lines 176-190), detect if the current badge is `stylist` and the user also has an admin-level role
3. Conditionally wrap that badge in a Tooltip with the explanatory hint
4. Non-stylist badges render unchanged

**Single file change, no database changes.**

