

## Remove Unfavorite Stars from Sidebar Navigation

### What Changes

Remove all three unpin/unfavorite star buttons from the sidebar analytics favorites section. Users will only be able to unfavorite items from within the Analytics Hub pages themselves (using the existing star buttons on the tab/subtab triggers).

### File to Modify

**`src/components/dashboard/CollapsibleNavGroup.tsx`**

Remove three star button blocks:

1. **Category header star** (lines 296-308) -- the hover-reveal star next to "SALES" header
2. **Overview link star** (lines 331-343) -- the hover-reveal star on the auto-generated "Overview" link
3. **Subtab link star** (lines 374-386) -- the hover-reveal star on each subtab link (e.g., "Goals")

After removal, the `onRemoveSubLink` prop will no longer be used in this rendering section. The prop can remain on the component interface since it may be used elsewhere, but these three render blocks will be deleted.

### Result

The sidebar favorites become pure navigation shortcuts -- clean links without inline management controls. All favoriting/unfavoriting is managed exclusively on the Analytics Hub pages via the existing `SubtabFavoriteStar` components on the tab triggers.

