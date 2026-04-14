

## Problem

The location list in the Splash Screen card renders all locations in insertion order with no pagination or sorting. Organizations with hundreds of locations will see an unusably long list.

## Solution

Add alphabetical sorting and client-side pagination (10 locations per page) to the location list.

### Changes

**File:** `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx`

1. **Sort locations alphabetically** — Apply `.sort((a, b) => a.name.localeCompare(b.name))` to the locations array before rendering.

2. **Paginate the list** — Add `currentPage` state, slice the sorted list to show 10 per page, and render pagination controls below the list using the existing `Pagination` component from `src/components/ui/pagination.tsx`.

3. **Pagination UX details:**
   - Show page controls only when there are more than 10 locations
   - Previous/Next buttons with page number indicators
   - Auto-reset to page 1 if the location list changes
   - If the currently selected location is on a different page, keep the selection but navigate the list to the relevant page

4. **Imports:** Add `Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext, PaginationLink` from `@/components/ui/pagination`.

### Technical details

- Sorting and pagination are both client-side since `useLocations` already fetches all org locations
- The sorted+paginated array is computed via `useMemo` for performance
- Page size constant: `LOCATIONS_PER_PAGE = 10`
- Pagination component styled to match the card's compact aesthetic (small text, muted colors)

