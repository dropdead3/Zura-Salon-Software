

# Highlight Duplicate Match Reasons in Merge Wizard

## What changes

In the ClientSelector search results, each client row will show colored badges indicating which fields match other visible results (e.g., "Same Phone", "Same Email", "Same Name"). This makes it immediately clear why two records are flagged as potential duplicates.

## Changes to `src/components/dashboard/clients/merge/ClientSelector.tsx`

### 1. Add imports
- `useMemo` from React
- `Mail`, `Phone`, `User` icons from lucide-react
- `Tooltip` components from radix

### 2. Compute match reasons across visible results

Add a `useMemo` that builds a map of `clientId -> matchReasons[]` by comparing all visible results (both `filteredResults` and `selectedClients`) against each other:

- **Phone match**: Two or more clients share the same normalized phone number
- **Email match**: Two or more clients share the same normalized email (case-insensitive)
- **Name match**: Two or more clients share the same full name (case-insensitive), only flagged if no phone/email match exists

### 3. Render match badges inline with contact info

Below each client's email/phone line, render small colored badges:

| Match | Badge | Icon | Color |
|---|---|---|---|
| Phone | "Same Phone" | Phone icon | Amber (warning tone) |
| Email | "Same Email" | Mail icon | Amber |
| Name | "Same Name" | User icon | Muted amber |

The matching field text (email or phone) will also be highlighted with `text-amber-500` so it visually pops compared to non-matching fields.

### 4. Also show match info on selected client badges

When clients are selected (shown as badges at the top), include a small tooltip showing which fields matched.

## Technical Details

| Area | Detail |
|---|---|
| File | `src/components/dashboard/clients/merge/ClientSelector.tsx` |
| New imports | `useMemo`, `Mail`, `Phone`, `User`, `Tooltip*` |
| New logic | `useMemo` computing `duplicateMatches: Map<string, string[]>` across all visible + selected clients |
| UI change | Amber match badges rendered below contact info per result row |
| Normalization | Phone: strip non-digits; Email: lowercase trim -- matches existing DB normalization logic |
