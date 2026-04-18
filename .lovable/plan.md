

## Goal
Rename the "Top Performers" card heading to "Top Staff" on the dashboard.

## Change
Locate the card title string and replace `Top Performers` → `Top Staff`. Likely in a component named along the lines of `TopPerformers*.tsx` under `src/components/dashboard/`.

## Files
- **Modify**: the dashboard card component containing the literal `TOP PERFORMERS` / `Top Performers` title (single string swap; `font-display` already handles uppercase).

## Out of scope
- Renaming the component file/symbol
- Changing the underlying ranking logic, tabs (Service/Retail), or counts
- Updating any related route, analytics event, or doc string

