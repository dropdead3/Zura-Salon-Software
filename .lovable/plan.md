

## Click-to-Crop Existing Profile Photo

### What You Asked
When clicking the profile photo, open the crop/resize modal with the current photo already loaded -- not just the file picker.

### Approach

**Two changes needed:**

**1. `ImageCropModal` -- Add `imageUrl` prop (lines 14-21, 44-77)**

The modal currently only accepts `imageFile: File | null`. Add an optional `imageUrl: string` prop. Update the `useEffect` that loads the image (line 44) to also handle a URL string: when `imageFile` is null but `imageUrl` is provided, load from the URL directly (no `createObjectURL` needed). Also add a "Replace Photo" button in the modal footer so users can pick a new file from within the modal.

**2. `MyProfile.tsx` -- Split avatar click from file picker click**

Currently `handlePhotoClick` (line 359) always opens the file input. Change it so:

- **When photo exists**: open the crop modal directly with `imageUrl={profile.photo_url}` and `imageFile={null}`
- **When no photo**: open the file picker as before

The avatar's overlay click handler (line 628) and the "Change Photo" button (line 654) both call `handlePhotoClick`, so both will get the new behavior automatically.

Add a "Replace" file input trigger inside the modal flow: when user clicks "Replace Photo" in the modal, it opens the file picker, and on file selection the modal reloads with the new file.

### Files Changed

**`src/components/dashboard/ImageCropModal.tsx`:**
- Add `imageUrl?: string` to props interface
- Update image-loading `useEffect` to handle URL when `imageFile` is null
- Add a "Replace Photo" button + hidden file input in the modal footer

**`src/pages/dashboard/MyProfile.tsx`:**
- Update `handlePhotoClick`: if `profile?.photo_url` exists, set `cropModalOpen(true)` without setting `cropImageFile` (pass URL instead)
- Pass `imageUrl={profile?.photo_url}` to `ImageCropModal`
- `handlePhotoChange` continues to work as before (sets `cropImageFile` and opens modal)

