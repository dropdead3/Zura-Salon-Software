

## Wire Website Card Preview to Use the Actual Website Component

Good prompt -- you're identifying a real drift problem. The `StylistCardPreview` (dashboard) and `StylistFlipCard` (actual website) are two completely separate implementations with subtle but meaningful differences. This means the "preview" isn't actually previewing what users see on the website. The right fix is to eliminate the duplicate and use the real component.

### Key Differences Found

| Aspect | StylistCardPreview (dashboard) | StylistFlipCard (website) |
|--------|-------------------------------|--------------------------|
| Image loading | Raw `<img>` | `ImageWithSkeleton` |
| Social links | Non-clickable `<span>` | Clickable `<a>` with hrefs |
| Bottom content | Static position | `translate-y-6` → slides up on hover |
| Back card location | Conditional on `locations.length > 0` | Always shows location |
| Focal point | Uses `objectPosition` from focal data | No focal point support |
| Book button | Non-interactive `<div>` | Clickable `<Link to="/booking">` |
| Card width | Fixed `w-64` | Responsive (fills grid) |

### Approach

Replace `StylistCardPreview` usage in the dashboard profile page with the actual `StylistFlipCard` component, wrapped to work in preview context.

### Technical Changes

**File: `src/components/home/StylistFlipCard.tsx`**
- Add optional `photoFocalX` and `photoFocalY` props to the `Stylist` type or accept them as overrides on the component
- Apply `objectPosition` to the `ImageWithSkeleton` when focal point data is present
- Add an optional `isPreview` prop that disables link navigation (replaces `<Link>` with `<div>`) and disables `onClick stopPropagation` behaviors so the card works as a non-navigating preview

**File: `src/data/stylists.ts`**
- Add optional `photo_focal_x` and `photo_focal_y` to the `Stylist` interface (or `card_focal_x`/`card_focal_y` since this is the card context)

**File: `src/pages/dashboard/MyProfile.tsx`**
- Replace `StylistCardPreview` import with `StylistFlipCard`
- Construct a `Stylist` object from the profile data and pass it to `StylistFlipCard` with `isPreview={true}`
- Remove the `StylistCardPreview` import entirely from this page

**File: `src/components/dashboard/ImageCropModal.tsx`**
- Update Step 2 (card compose) and Step 3 (review) to use `StylistFlipCard` with `isPreview` instead of `StylistCardPreview`
- Construct the `Stylist` object from `cardPreviewProps`

**File: `src/components/dashboard/StylistCardPreview.tsx`**
- This file can be deleted once all consumers are migrated. It's a duplicate that will always drift.

**File: `src/components/dashboard/website-editor/StylistsContent.tsx`**
- If this also uses `StylistCardPreview`, migrate to `StylistFlipCard` with `isPreview`

### What This Achieves
- The profile page preview is pixel-identical to what appears on the website
- Single source of truth -- no more drift between preview and production
- Focal point support flows through the real component
- Future website card changes automatically appear in the preview

### Files Changed
- `src/components/home/StylistFlipCard.tsx` -- add `isPreview` prop + focal point support
- `src/data/stylists.ts` -- add focal point fields to `Stylist` interface
- `src/pages/dashboard/MyProfile.tsx` -- use `StylistFlipCard` instead of `StylistCardPreview`
- `src/components/dashboard/ImageCropModal.tsx` -- use `StylistFlipCard` in card compose/review steps
- `src/components/dashboard/StylistCardPreview.tsx` -- delete (duplicate eliminated)
- `src/components/dashboard/website-editor/StylistsContent.tsx` -- migrate if applicable

