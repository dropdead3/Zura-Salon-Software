

## Persist Zoom and Rotation Per-Step to Database

The root cause: **zoom and rotation are never saved**. The database only has `photo_focal_x/y` and `card_focal_x/y`. When the wizard closes, zoom resets to 100% and rotation to 0° — so the saved photo never matches what the user composed.

### 1. Add 4 new columns to `employee_profiles`

```sql
ALTER TABLE employee_profiles
  ADD COLUMN avatar_zoom real DEFAULT 1,
  ADD COLUMN avatar_rotation smallint DEFAULT 0,
  ADD COLUMN card_zoom real DEFAULT 1,
  ADD COLUMN card_rotation smallint DEFAULT 0;
```

### 2. Update the save flow to persist zoom/rotation

**`src/hooks/useEmployeeProfile.ts`** — `useUploadProfilePhoto`
- Accept `avatarZoom`, `avatarRotation`, `cardZoom`, `cardRotation` in the mutation input
- Include them in the `updatePayload` written to `employee_profiles`

**`src/components/dashboard/ImageCropModal.tsx`** — `onCropComplete` signature
- Expand to pass all 8 values: `(blob, focalX, focalY, cardFocalX, cardFocalY, avatarZoom, avatarRotation, cardZoom, cardRotation)`

**`src/pages/dashboard/MyProfile.tsx`** — `handleCroppedPhotoUpload`
- Forward all 8 values to `uploadPhoto.mutateAsync`
- Pass `initialAvatarZoom`, `initialAvatarRotation`, `initialCardZoom`, `initialCardRotation` props to the modal from the loaded profile

### 3. Apply saved zoom/rotation at render time

**`src/components/home/StylistFlipCard.tsx`**
- Accept `cardZoom` prop, apply `transform: scale(cardZoom)` with `transformOrigin` at the focal point on the photo `<img>`

**`src/hooks/useHomepageStylists.ts`**
- Add `card_zoom` and `card_rotation` to the select query and interface

**Avatar renders** (sidebar, team directory, chat)
- Apply `avatar_zoom` / `avatar_rotation` from the profile wherever the circular avatar is rendered using `object-position` + `transform: scale()`

### 4. Initialize modal with saved values

**`src/components/dashboard/ImageCropModal.tsx`**
- Add props: `initialAvatarZoom`, `initialAvatarRotation`, `initialCardZoom`, `initialCardRotation`
- Initialize state from these props instead of hardcoded `1` / `0`
- Reset effect uses the initial values instead of defaults

This ensures each step's composition (focal point + zoom + rotation) is independently saved and correctly rendered everywhere.

