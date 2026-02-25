

## Add Circle Avatar Composer + Website Card Composer (3-Step Wizard)

Your prompt is well-structured -- separating the two composition contexts (circle avatar vs. website card) is the right call since `object-cover` on a circle crops very differently than on a 3:4 rectangle. One improvement for future prompts: specifying whether you want a single shared focal point or two independent focal points would help scope the data model upfront.

### What's Missing Today

The current modal only has one compose frame (3:4 card shape). The circular avatar preview -- which is how the photo appears across the entire platform (sidebar, team directory, chat, kiosk) -- was lost during the refactor. Users can't see whether their face is centered in the circle.

### Proposed 3-Step Wizard

```text
Step 1: Profile Avatar Composer     Step 2: Website Card Composer     Step 3: Final Preview
┌──────────────────────┐            ┌──────────────────────┐          ┌──────────────────────┐
│  ┌──────────────┐    │            │  ┌────────────┐      │          │  ○ Avatar    ▭ Card  │
│  │   ╭──────╮   │    │            │  │            │      │          │                      │
│  │   │  ⊕   │   │    │            │  │    ⊕       │      │          │  Side-by-side review │
│  │   ╰──────╯   │    │            │  │            │      │          │                      │
│  └──────────────┘    │            │  │            │      │          │  [← Back] [Save]     │
│  Zoom / Rotate       │            │  └────────────┘      │          └──────────────────────┘
│  [Replace] [Next →]  │            │  Focal point adjust  │
└──────────────────────┘            │  [← Back] [Next →]   │
                                    └──────────────────────┘
```

- **Step 1 — Profile Avatar**: Circle frame (matching the 160px avatar used on the profile page). User clicks/drags to set focal point. Zoom and rotate controls available. This focal point is stored as `photo_focal_x` / `photo_focal_y` (already in DB).
- **Step 2 — Website Card**: 3:4 card frame. User can further adjust the focal point for the card context. This requires a **second pair of focal point columns** (`card_focal_x` / `card_focal_y`) since what looks centered in a circle may need different positioning in a tall rectangle.
- **Step 3 — Final Review**: Side-by-side preview showing both the circle avatar and the StylistCardPreview with their respective focal points. Save commits both.

### Technical Changes

**Database Migration**
- Add `card_focal_x SMALLINT DEFAULT 50` and `card_focal_y SMALLINT DEFAULT 50` to `employee_profiles`. The existing `photo_focal_x`/`photo_focal_y` columns serve the avatar; the new columns serve the website card.

**File: `src/components/dashboard/ImageCropModal.tsx`**
- Change step state to `'avatar' | 'card' | 'review'`
- Step 1 (`avatar`): Replace the current 3:4 frame with a **circle frame** (~200px diameter). Same focal-point click/drag interaction, zoom, rotation. Progress bar shows 3 segments.
- Step 2 (`card`): Show the 3:4 frame (similar to today's compose step). Separate `cardFocalX` / `cardFocalY` state initialized from `initialCardFocalX` / `initialCardFocalY` props.
- Step 3 (`review`): Generate the resized blob, show side-by-side circle avatar (with `objectPosition` from avatar focal point) and StylistCardPreview (with card focal point). Only visible when `cardPreviewProps` is provided.
- Footer progression: Step 1 has "Replace | Cancel | Next →", Step 2 has "← Back | Next →", Step 3 has "← Back | Save Photo".
- Update `onCropComplete` signature to include all four focal values: `(blob, focalX, focalY, cardFocalX, cardFocalY)`.
- Non-wizard mode (no `cardPreviewProps`): 2-step flow — avatar compose → save.

**File: `src/pages/dashboard/MyProfile.tsx`**
- Update `handleCroppedPhotoUpload` to accept and pass both focal point pairs to the upload mutation.

**File: `src/hooks/useEmployeeProfile.ts`**
- Expand `useUploadProfilePhoto` to save `card_focal_x` and `card_focal_y` alongside the existing avatar focal point columns.

**File: `src/hooks/useAdminProfile.ts`**
- Mirror the same dual-focal-point save.

**File: `src/components/dashboard/StylistCardPreview.tsx`**
- Already accepts `photoFocalX` / `photoFocalY`. The MyProfile call site will now pass the card-specific values instead of the avatar values.

**File: `src/components/dashboard/website-editor/StylistsContent.tsx`**
- Pass `card_focal_x` / `card_focal_y` from the profile query to StylistCardPreview (instead of the avatar focal point).

### Files Changed
- **Migration**: Add `card_focal_x`, `card_focal_y` columns
- `src/components/dashboard/ImageCropModal.tsx` — 3-step wizard with circle frame, card frame, and review
- `src/pages/dashboard/MyProfile.tsx` — pass dual focal points
- `src/hooks/useEmployeeProfile.ts` — save card focal point
- `src/hooks/useAdminProfile.ts` — save card focal point
- `src/components/dashboard/StylistCardPreview.tsx` — no changes needed (already supports focal props)
- `src/components/dashboard/website-editor/StylistsContent.tsx` — pass card-specific focal point

### Enhancement Suggestion
Consider whether avatars elsewhere in the platform (sidebar, chat, team directory) should also respect `photo_focal_x`/`photo_focal_y` via `object-position`. Currently most avatar components use default `object-cover` center. A follow-up pass could wire the avatar focal point into the shared Avatar component.

