

## Wire `getAvatarStyle` to All Navigation Avatars

The top bar and platform layout avatars render `<AvatarImage>` without applying the saved `avatar_zoom`, `avatar_rotation`, or `photo_focal_x/y` values. The `getAvatarStyle` utility already exists — it just needs to be imported and applied.

### Files to change

**1. `src/components/dashboard/SuperAdminTopBar.tsx` (line ~251)**
- Import `getAvatarStyle` from `@/lib/avatar-utils`
- Add `className="object-cover"` and `style={getAvatarStyle(employeeProfile)}` to the `<AvatarImage>`

**2. `src/components/platform/layout/PlatformHeader.tsx` (line ~166)**
- Import `getAvatarStyle`
- Apply `className="object-cover"` and `style={getAvatarStyle(profile)}` to the profile `<AvatarImage>`

**3. `src/components/platform/layout/PlatformSidebar.tsx` (line ~315)**
- Import `getAvatarStyle`
- Apply `className="object-cover"` and `style={getAvatarStyle(profile)}` to the sidebar `<AvatarImage>`

All three changes are identical in pattern: add the import and apply the style helper to each `<AvatarImage>` element.

