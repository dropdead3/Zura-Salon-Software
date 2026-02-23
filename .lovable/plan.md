
# Show Both Duplicate and Canonical Profiles Together in Search

## Problem
When you search for a client name in the directory, you only see the matching record. If "Eric Day" is a duplicate of another profile (e.g., different name spelling), the linked canonical profile doesn't appear in search results because it doesn't match the search query. You can't see both sides of the duplicate relationship.

## Solution
Enhance the search/filter logic so that whenever a duplicate or canonical client appears in results, its linked counterpart is automatically pulled in too. Both records will appear together, with a subtle visual grouping indicator.

## Changes to `src/pages/dashboard/ClientDirectory.tsx`

### 1. Expand search results to include linked profiles

After the existing search filter (around line 274), add logic that:
- For each duplicate in the results, checks if its `canonical_client_id` profile is missing from results, and adds it
- For each canonical profile in the results, checks if any duplicates pointing to it are missing, and adds them
- Uses the already-fetched `processedClients` list as the lookup source (no extra DB query needed)

### 2. Mark auto-included profiles

Profiles pulled in automatically (not matching the search themselves) get a small "Linked duplicate" or "Linked original" indicator so you understand why they appeared.

### 3. Sort linked profiles adjacent

When a profile is auto-included, position it immediately after its linked counterpart in the list so the pair is visually grouped together.

## Technical Details

| Area | Detail |
|---|---|
| File | `src/pages/dashboard/ClientDirectory.tsx` |
| Location | `filteredClients` useMemo, after search filter (line ~280) |
| Logic | Build a Set of filtered IDs, then scan for missing canonical/duplicate links from `processedClients` |
| No new queries | Uses the already-loaded full client list for lookups |
| New computed field | `linkedReason?: 'canonical' \| 'duplicate'` added to auto-included profiles |
| Sorting | After main sort, re-order so linked pairs sit adjacent (duplicate immediately after its canonical, or vice versa) |
