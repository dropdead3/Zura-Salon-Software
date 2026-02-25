

## Fix Website Card Layout, Padding, and Preview Wiring

Good catch -- the screenshot reveals several layout and spacing issues on the live website card that need tightening. Since the preview now uses the same `StylistFlipCard` component, fixing the website card automatically fixes the preview. That's the benefit of the unification we just did.

### Issues Identified from Screenshot

1. **Bottom content area padding**: The `p-5` padding on the bottom overlay is tight on mobile. The content (level label, name, social handle, button, tap hint) is vertically cramped when all elements are present.
2. **translate-y-6 hides content by default**: The bottom content block slides up on hover. On mobile (no hover), the social handle and button area start partially offscreen, making them hard to see.
3. **"Not Booking" button spacing**: The button sits too close to the social handle above it. The `mb-4` gap on the social container isn't enough visual separation.
4. **"Tap to learn more" hint**: The `mt-4` adds vertical space that pushes the card content further down, compressing the button area.
5. **Specialty badges overlap risk**: On narrow cards, the `top-4 left-4 right-4` badges can wrap into two rows and overlap the gradient/content area below.

### Technical Changes

**File: `src/components/home/StylistFlipCard.tsx`**

1. **Increase bottom padding**: Change bottom overlay from `p-5` to `px-5 pb-5 pt-6` for better breathing room above the level label.
2. **Reduce translate-y offset**: Change `translate-y-6` to `translate-y-3` so less content is hidden in the default (non-hovered) state. The social handle and book button should be visible without hover.
3. **Tighten social-to-button gap**: Reduce social container `mb-4` to `mb-3` for tighter vertical rhythm.
4. **Reduce "Tap to learn more" spacing**: Change `mt-4` to `mt-3` and reduce `translate-y-2` to `translate-y-1` for the hint text.
5. **Badge spacing**: Add `max-w-[calc(100%-2rem)]` on badge container to prevent overflow and ensure consistent gap from card edges.

**File: `src/pages/dashboard/MyProfile.tsx`** -- No changes needed. The preview at line 1304 already uses `StylistFlipCard` with `isPreview`, so fixes flow through automatically.

**File: `src/components/dashboard/ImageCropModal.tsx`** -- No changes needed. The review step at line 564 already uses `StylistFlipCard` with `isPreview` and passes `photoFocalX`/`photoFocalY`.

### Wiring Verification

The card preview wiring is already correct:
- **MyProfile.tsx** (line 1304): Passes `card_focal_x`/`card_focal_y` from profile data, plus all form fields (name, display_name, level, specialties, etc.)
- **ImageCropModal.tsx review step** (line 564): Passes `cardFocalX`/`cardFocalY` from the wizard state, plus `cardPreviewProps` data
- **StylistsSection.tsx** (line 676): Uses the real component on the website -- same component, same layout

All three consumers render the identical `StylistFlipCard`. Fixing the component once propagates everywhere.

### Files Changed
- `src/components/home/StylistFlipCard.tsx` -- padding, translate-y, spacing adjustments on the front card overlay

