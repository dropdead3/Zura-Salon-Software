

## Add Separate Zoom per Composition Step

Currently, the modal uses a single `zoom` state shared across both the avatar and card steps. When a user sets zoom to 150% on the avatar circle, switching to the card step carries that zoom over -- but the card frame has a completely different aspect ratio, so the zoom context is wrong. Each step needs its own remembered zoom level.

### Technical Changes

**File: `src/components/dashboard/ImageCropModal.tsx`**

1. Replace the single `zoom` state with two: `avatarZoom` and `cardZoom`, both defaulting to 1.
2. Derive `currentZoom` and `setCurrentZoom` from the step (same pattern already used for `currentFocalX`/`currentFocalY` on lines 148-151).
3. Update all zoom references (`zoom` on lines 67, 253-254, 293, 346, 361) to use `currentZoom` / `setCurrentZoom`.
4. Update `handleZoomIn` and `handleZoomOut` to use `setCurrentZoom`.
5. On modal reset (line 97), reset both `avatarZoom` and `cardZoom` to 1.
6. On photo replace (line 138-143), reset both zooms to 1.

**Database**: No changes needed. Zoom is a composition-time control (affects how the focal point is set), not a persisted rendering property. The focal point coordinates already capture the output of the zoom interaction.

### Files Changed
- `src/components/dashboard/ImageCropModal.tsx` -- split zoom state into `avatarZoom` + `cardZoom`

