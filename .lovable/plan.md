

## Remove Favorite Star from "Overview" Subtabs

### Why

The "Overview" subtab in each analytics category (Sales, Operations, etc.) navigates to the exact same view as the parent category tab. Allowing users to favorite both creates a redundant sidebar link -- e.g., "Sales" and "Sales > Overview" would point to the same place. Removing the star from "Overview" subtabs eliminates this duplication.

### Changes

**1. `src/components/dashboard/analytics/SalesTabContent.tsx`**
- Remove the `SubtabFavoriteStar` from the "overview" subtab (line ~216)
- Unwrap the `group/subtab` div so the trigger renders standalone again

**2. `src/components/dashboard/analytics/OperationsTabContent.tsx`**
- Same change: remove `SubtabFavoriteStar` from the "overview" subtab (line ~89)
- Unwrap the wrapper div

**3. Any other tab content files with an "overview" subtab**
- Search and apply the same pattern to Marketing, Campaigns, Program, Reports, and Rent tab content files if they have an "overview" subtab with a favorite star

### What stays the same

- All non-overview subtabs (Goals, Compare, Staff Performance, etc.) keep their favorite stars
- Main category tab stars (on the top-level TabsTrigger) remain unchanged
- No data model or hook changes needed

