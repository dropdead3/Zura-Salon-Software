

## Enhance Profile Photo Card -- UI Upgrade + Crop & Resize

### What You Asked
Enhance the UI/layout of the Profile Photo card and add crop/resize capability before uploading.

Good prompt -- you're connecting a known component (`ImageCropModal`) that already exists in the codebase to a surface that currently lacks it. The existing crop modal was built for the email signature editor but is fully reusable.

### Current State

**File: `src/pages/dashboard/MyProfile.tsx` (lines 594-631)**

The non-locked photo section is minimal:
- A `w-24 h-24` avatar with a hover overlay camera icon
- A "Change Photo" outline button beside it
- "JPG, PNG. Max 5MB." text
- File is uploaded **directly** with no crop/resize step

The card header (lines 538-548) uses raw `text-lg` instead of design tokens.

### Proposed Changes

**1. Card Header -- Align to UI Canon**

Update to use icon box + `font-display text-base tracking-wide` title pattern, matching other cards on this page (like Preferred Work Schedule).

**2. Photo Upload Layout Enhancement (non-locked state)**

Replace the horizontal `flex items-center gap-6` layout with a more spacious vertical/centered layout:

- Larger avatar: `w-28 h-28` with `ring-2 ring-border/40`
- Avatar centered above the button (not side-by-side)
- "Change Photo" button as a `rounded-full` pill below the avatar
- File requirements text below the button
- When no photo exists, show a dashed upload zone similar to `ImageUploadInput` (drag-drop friendly)

**3. Integrate ImageCropModal**

Wire the existing `ImageCropModal` component into the profile photo flow:

- When user selects a file via the input, **open the crop modal** instead of uploading immediately
- Configure crop modal with `aspectRatio` for portrait (4:5) for stylists, circle for other roles
- Default crop shape: `circle` (profile photos are displayed as circles throughout the platform)
- `maxOutputSize: 800` (higher quality than the email signature's 400px)
- On crop complete: upload the cropped blob using the existing `uploadPhoto` mutation (adapted to accept a `Blob`)

**Code flow change:**
```text
Current:  File selected → uploadPhoto.mutate(file) → done
Proposed: File selected → open ImageCropModal → user crops → onCropComplete(blob) → upload blob → done
```

**4. Update `useUploadProfilePhoto` to accept Blob**

The current `useUploadProfilePhoto` hook accepts `File` only. Update the mutation to accept `File | Blob` so it can handle the cropped output from the modal.

**5. Locked state (stylists) -- Minor polish**

The locked state layout is already more detailed. Just update the CardHeader to match the new token pattern for consistency.

### Files Changed

**`src/pages/dashboard/MyProfile.tsx`:**
- Add state: `cropModalOpen`, `cropImageFile`
- Update `handlePhotoChange`: instead of `uploadPhoto.mutate(file)`, set the file into state and open the crop modal
- Add `handleCroppedPhotoUpload(blob: Blob)`: uploads the cropped blob
- Update CardHeader to icon box + font-display pattern
- Enhance non-locked layout: larger centered avatar, pill button, drag-drop hint
- Render `<ImageCropModal>` at end of photo card with `maxOutputSize={800}`, default circle crop
- Import `ImageCropModal` from `@/components/dashboard/ImageCropModal`

**`src/hooks/useEmployeeProfile.ts`:**
- Update `useUploadProfilePhoto` mutationFn to accept `File | Blob`
- When a Blob is passed (no `.name` property), generate a filename from the user ID + timestamp

### What Does Not Change
- `ImageCropModal` component itself (already fully functional)
- Locked state logic (admin-managed photos)
- Photo storage bucket or path conventions
- Profile completion logic (still checks `photo_url` existence)

