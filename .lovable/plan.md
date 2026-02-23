
# Default Client Directory Sort to Alphabetical by Name

## Problem
The Client Directory currently defaults to sorting by `total_spend` (descending). The expected default is alphabetical by client name (A-Z).

## Change (single file: `src/pages/dashboard/ClientDirectory.tsx`)

Update the two `useState` initializers on lines 73-74:

- `sortField`: change default from `'total_spend'` to `'name'`
- `sortDirection`: change default from `'desc'` to `'asc'`

This ensures the directory loads sorted A-Z by name. Users can still click any sort button (Spend, Visits, Recent) to re-sort as needed.
