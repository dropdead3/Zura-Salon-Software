

## Build Website Card Preview into the Profile Photo Wizard

### Concept

The ImageCropModal currently operates in isolation -- the user crops their photo but has no visibility into how it will actually appear on their website stylist card. The card uses a 3:4 aspect ratio with `object-cover`, gradient overlays, and specialty badges, which means the crop preview alone doesn't tell the full story.

The solution: Add a **"Card Preview" step** to the crop modal, turning it into a two-step wizard. After cropping, the user sees their photo rendered inside a live StylistCardPreview before committing.

### Architecture

**Step 1 — Crop & Resize** (existing functionality, unchanged)
**Step 2 — Website Card Preview** (new)
- Renders a mini StylistCardPreview using a temporary object URL from the cropped blob
- User sees exactly how the card will look on the website homepage
- "Back" returns to crop adjustments; "Save" commits the final image

### Technical Changes

**File: `src/components/dashboard/ImageCropModal.tsx`**

1. **Expand props interface** -- Add optional `cardPreviewProps` object containing: `name`, `displayName`, `level`, `instagram`, `tiktok`, `preferredSocialHandle`, `highlightedServices`, `specialties`, `bio`, `isBooking`, `locations`. When provided, the modal becomes a 2-step wizard. When absent (non-stylist users), it behaves as today.

2. **Add wizard step state** -- `const [step, setStep] = useState<'crop' | 'preview'>('crop');` Reset to `'crop'` when modal opens.

3. **Generate preview blob** -- When user clicks "Next" (replacing "Apply Crop"), generate the cropped blob via the existing canvas logic but store it in state (`previewBlob`) instead of immediately calling `onCropComplete`. Create a temporary object URL for the preview.

4. **Step 2 UI** -- Show the StylistCardPreview component with `photoUrl` set to the temporary blob URL. Include:
   - A centered card preview at appropriate scale
   - "Back to Crop" button to return to step 1
   - "Save Photo" as the final commit button that calls `onCropComplete(previewBlob)`

5. **Footer changes** -- Step 1 footer shows "Replace | Cancel | Next →". Step 2 footer shows "← Back | Save Photo".

6. **Cleanup** -- Revoke the temporary blob URL on unmount and when going back to step 1.

**File: `src/pages/dashboard/MyProfile.tsx`**

7. **Pass card preview props to ImageCropModal** -- At the existing `<ImageCropModal>` call site (~line 678), add the `cardPreviewProps` object populated from `formData` and profile state:
   ```
   cardPreviewProps={{
     name: formData.full_name,
     displayName: formData.display_name,
     level: formData.stylist_level,
     instagram: formData.instagram,
     tiktok: formData.tiktok,
     preferredSocialHandle: formData.preferred_social_handle,
     highlightedServices: formData.highlighted_services,
     specialties: formData.specialties,
     bio: formData.bio,
     isBooking: profile?.is_booking !== false,
     locations: formData.location_ids.map(...),
   }}
   ```
   Only pass this prop when `showProfessionalDetails` is true (stylists/assistants).

### Files Changed

- `src/components/dashboard/ImageCropModal.tsx` -- wizard step logic, preview step UI, expanded props
- `src/pages/dashboard/MyProfile.tsx` -- pass `cardPreviewProps` to ImageCropModal

### What Stays the Same

- StylistCardPreview component is reused as-is (no modifications)
- Non-stylist users see the existing single-step crop flow
- The crop canvas logic is unchanged

