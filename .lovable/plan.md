

## Add "Manage Specialties" Link on Professional Details Card

**Scope**: Add a small admin-only link in the Professional Details `CardHeader` that navigates to the Website Editor's Specialties manager.

### Implementation

**File: `src/pages/dashboard/MyProfile.tsx`**

1. In the `CardHeader` of the Professional Details card (line ~1126-1128), add a conditional link visible only when the user has `super_admin` or `admin` role.
2. Use the existing `roles` array (already available) to check `roles.includes('super_admin') || roles.includes('admin')`.
3. Render a small `Button` as a `Link` to `/dashboard/admin/website-sections?tab=stylists` with text like "Manage Specialties" and an `ArrowRight` icon.
4. Style as a compact ghost/outline button (`variant="ghost"`, `size="sm"`) to keep it subtle.

**Result**: The CardHeader becomes:
```
PROFESSIONAL DETAILS          [Manage Specialties →]
```

The link only appears for super admins and account owners. It takes them directly to the Website Editor's stylists tab where `SpecialtyOptionsManager` lives.

