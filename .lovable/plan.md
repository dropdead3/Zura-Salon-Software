

## Apply Saved Avatar Composition to Profile Photo Display

The modal saves `avatar_zoom`, `avatar_rotation`, `photo_focal_x`, `photo_focal_y` correctly, but the rendered avatar on the profile page ignores them entirely — it just shows the raw image centered.

### Changes

**1. `src/pages/dashboard/MyProfile.tsx` — Profile photo card avatar (line ~633)**

Apply saved composition values to the `<AvatarImage>`:
```tsx
<AvatarImage 
  src={profile.photo_url} 
  alt={profile?.full_name}
  className="object-cover"
  style={{
    objectPosition: `${(profile as any)?.photo_focal_x ?? 50}% ${(profile as any)?.photo_focal_y ?? 50}%`,
    transform: `scale(${(profile as any)?.avatar_zoom ?? 1}) rotate(${(profile as any)?.avatar_rotation ?? 0}deg)`,
    transformOrigin: `${(profile as any)?.photo_focal_x ?? 50}% ${(profile as any)?.photo_focal_y ?? 50}%`,
  }}
/>
```

Also apply this to the stylist-locked avatar variant (~line 587 area) if it exists.

**2. `src/components/ui/avatar.tsx` — Ensure overflow hidden**

Verify the `Avatar` root has `overflow-hidden` (it likely does via Radix defaults). The `scale()` transform will enlarge the image beyond the circle boundary, so clipping is essential.

**3. `src/pages/dashboard/ViewProfile.tsx` — Admin view profile avatar**

Same treatment: apply saved `avatar_zoom`, `avatar_rotation`, `photo_focal_x/y` to `<AvatarImage>` style.

**4. Consider a reusable helper**

Create a utility function to avoid repeating the style computation:
```tsx
// src/lib/avatar-utils.ts
export function getAvatarStyle(profile: { photo_focal_x?: number; photo_focal_y?: number; avatar_zoom?: number; avatar_rotation?: number } | null) {
  const fx = profile?.photo_focal_x ?? 50;
  const fy = profile?.photo_focal_y ?? 50;
  return {
    objectPosition: `${fx}% ${fy}%`,
    transform: `scale(${profile?.avatar_zoom ?? 1}) rotate(${profile?.avatar_rotation ?? 0}deg)`,
    transformOrigin: `${fx}% ${fy}%`,
  };
}
```

This can be imported wherever avatars are rendered (sidebar, team directory, chat) for consistent composition.

