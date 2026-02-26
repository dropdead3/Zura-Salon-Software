

## Show All Role Badges in Top Bar

Currently the top bar shows only the highest-priority role (e.g., "Super Admin"). The user wants every assigned role to appear as its own badge, plus an "Account Owner" distinction when `is_primary_owner` is true.

### Approach

Replace the single-badge logic with a multi-badge rendering system that iterates over `actualRoles` and also checks `employeeProfile?.is_primary_owner`.

### File: `src/components/dashboard/DashboardLayout.tsx`

1. **Replace `getAccessLabel` / `getAccessBadgeColor` / `getAccessIcon` single-return functions** with per-role lookup helpers that return label, icon, and color for any given role
2. **Build a `roleBadges` array** from `actualRoles`, mapping each role to its badge config (label, icon, color classes)
3. **Prepend "Account Owner"** badge (with a distinct icon like `Gem` or `Star`) if `employeeProfile?.is_primary_owner` is true — styled with a premium gold treatment
4. **Pass the badges array** to `SuperAdminTopBar` instead of the single `getAccessLabel`/`getAccessBadgeColor`/`AccessIcon` props

### File: `src/components/dashboard/SuperAdminTopBar.tsx`

5. **Update props** to accept a `roleBadges` array instead of single-badge props
6. **Render multiple badges** in the right zone, each with its own icon and color. At narrow widths, show only icons; at wider widths, show labels
7. **Responsive behavior**: At `2xl` show full labels on all badges; at `xl` show abbreviated labels on primary badge only and icons for the rest; below `xl` show icons only via tooltip

### File: `src/components/dashboard/DashboardLayout.tsx` (mobile bar)

8. **Update the mobile top bar** (line ~1061) to also render multiple badges instead of one

### Role-to-badge mapping (reused in both locations)

```text
Account Owner  → Gem icon,    premium gold gradient
Super Admin    → Crown icon,  amber-gold gradient (existing)
Admin (GM)     → Crown icon,  amber-orange gradient (existing)
Manager        → Shield icon, purple
Stylist        → Scissors,    blue
Receptionist   → Headset,     green
Assistant      → HandHelping, amber
```

### Role display order

Account Owner (if applicable) → Super Admin → Admin → Manager → Stylist → Receptionist → Assistant

### Technical detail

- Create a shared helper `getRoleBadgeConfig(role: AppRole)` returning `{ label, shortLabel, icon, colorClasses }` to avoid duplicating the mapping
- The `is_primary_owner` check uses the existing `employeeProfile` already available in DashboardLayout
- No database changes required — `actualRoles` already contains all assigned roles from `user_roles` table

