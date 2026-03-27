

## Preview-on-Hover for Analytics Cards

Add an eye icon to each analytics card row in the Customize Dashboard drawer. On hover, it shows a tooltip-style popover with a static preview image of what that card looks like with sample data.

### Approach

Use static preview images (one per card) rather than rendering live components — this keeps the drawer lightweight, avoids data dependencies, and gives full control over the preview appearance.

### Changes

**1. Create preview images**
- Generate a set of static preview screenshots (PNG) for each of the 12 pinnable cards, stored in `src/assets/analytics-previews/`
- Each image shows the card populated with realistic faux data at a consistent size (~400px wide)
- Images named by card ID: `sales_overview.png`, `revenue_breakdown.png`, etc.

**2. Create a preview map (`src/components/dashboard/analyticsCardPreviews.ts`)**
- Export a `Record<string, { src: string; alt: string }>` mapping each card ID to its preview image import
- This keeps the mapping centralized and type-safe

**3. Update `SortablePinnedCardItem`**
- Add an `Eye` icon button between the label and the toggle switch
- On hover (using `HoverCard` from Radix), display the preview image in a floating card
- The preview popover appears to the left of the drawer (side="left") so it doesn't overlap the panel
- Props addition: `previewSrc?: string` — optional, so rows without previews degrade gracefully

**4. Update `DashboardCustomizeMenu`**
- Pass `previewSrc` from the preview map to each `SortablePinnedCardItem` in both pinned and unpinned lists

### UI Details

- Eye icon: `w-4 h-4 text-muted-foreground/40 hover:text-muted-foreground` — subtle, not competing with the toggle
- HoverCard content: `w-[380px] p-2 rounded-xl` with the preview image, card label as caption
- Preview image: `rounded-lg` with a subtle border to frame it
- Placement: `side="left"` with `sideOffset={16}` to float outside the drawer

### Technical Notes

- Since the drawer is a portal (PremiumFloatingPanel), HoverCard portals will layer correctly
- Preview images will be ES module imports from `src/assets/` for proper bundling
- For the initial implementation, placeholder preview images can be created programmatically or captured manually — the architecture supports swapping them later

