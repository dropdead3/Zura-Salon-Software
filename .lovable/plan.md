

## Refactor: Preserve Original Photo, Add Focal-Point Composition

### What You're Asking For (and It's the Right Call)

Your instinct is correct -- the current flow destructively crops the image down to a 400x400 square, permanently discarding the rest of the photo data. That means every time someone wants a different framing, they have to re-upload. The modal should preserve the full image and just let users compose how it appears on the card.

### Architecture

The modal becomes a **compose tool** instead of a crop tool:

1. **Save the full image** at original aspect ratio, resized to max 1200px longest side, compressed as WebP. No square cropping. No data loss.
2. **Store a focal point** (`photo_focal_x`, `photo_focal_y`) in the database as percentages (0-100). This tells the card where to anchor `object-position`.
3. **The compose step** lets users drag the image within the card's 3:4 frame to set the focal point. The card preview updates live.
4. **Consumers** (StylistCardPreview, avatars) apply `object-position` using the stored focal point.

```text
Current flow:
  Upload → Crop to 400x400 square → Save cropped square → Card uses object-cover center

New flow:
  Upload → Resize to max 1200px (keep aspect ratio) → Compose focal point → Save full image + focal point → Card uses object-position from focal point
```

### Technical Changes

**Database Migration**
- Add `photo_focal_x SMALLINT DEFAULT 50` and `photo_focal_y SMALLINT DEFAULT 50` to `employee_profiles`. Defaults to center (50%, 50%).

**File: `src/components/dashboard/ImageCropModal.tsx`**
- Remove the `generateCroppedBlob` canvas-crop logic entirely.
- Replace with `generateResizedBlob` that outputs the full image at max 1200px longest side (maintaining aspect ratio), with rotation applied, as WebP 0.82.
- Replace the crop-frame canvas with a **card-frame composer**: show the image inside a 3:4 aspect ratio frame (matching the card), let users drag to set the focal point.
- Remove circle/square shape toggle (no longer cropping).
- The zoom slider stays (controls preview magnification for composition).
- Output: `{ blob: Blob, focalX: number, focalY: number }` instead of just a cropped blob.
- Update `onCropComplete` prop signature to `onPhotoComplete: (blob: Blob, focalX: number, focalY: number) => void`.

**File: `src/pages/dashboard/MyProfile.tsx`**
- Update the `ImageCropModal` callback to pass `focalX` and `focalY` to the upload mutation.
- After upload, save `photo_focal_x` and `photo_focal_y` to the employee profile.

**File: `src/hooks/useEmployeeProfile.ts`**
- Expand `useUploadProfilePhoto` to accept and save focal point values alongside the photo URL.

**File: `src/hooks/useAdminProfile.ts`**
- Mirror the same focal point save logic.

**File: `src/components/dashboard/StylistCardPreview.tsx`**
- Accept optional `photoFocalX` and `photoFocalY` props.
- Apply `style={{ objectPosition: '${focalX}% ${focalY}%' }}` to the `<img>` tag (line 99) instead of relying on default `object-cover` center.

**File: `src/components/dashboard/website-editor/StylistsContent.tsx`** (and other card consumers)
- Pass focal point data from the profile query to the card component.

### What This Preserves
- Full original photo data (no destructive cropping)
- Rotation support (applied during resize)
- WebP compression and cache headers (from previous optimization)
- The card preview step in the wizard

### What This Removes
- Circle/square crop shape toggle (not needed -- no cropping)
- Fixed square output size (`maxOutputSize`)
- Canvas-based crop extraction

### Files Changed
- **Migration**: Add `photo_focal_x`, `photo_focal_y` columns to `employee_profiles`
- `src/components/dashboard/ImageCropModal.tsx` -- replace crop with resize + focal-point composer
- `src/pages/dashboard/MyProfile.tsx` -- pass focal point to upload callback
- `src/hooks/useEmployeeProfile.ts` -- save focal point on upload
- `src/hooks/useAdminProfile.ts` -- same focal point save
- `src/components/dashboard/StylistCardPreview.tsx` -- apply `object-position` from focal point
- `src/components/dashboard/website-editor/StylistsContent.tsx` -- pass focal point to card

