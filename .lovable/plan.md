

# Redesigned Duplicates Tab: Paired Card Layout

## Problem

The current Duplicates tab shows duplicates as a flat list of individual rows. To see which records match and why, you have to click a small badge to expand a drilldown panel. This makes it hard to quickly scan and resolve duplicates.

## Solution

Replace the flat list rendering **only when `activeTab === 'duplicates'`** with a **grouped paired-card layout**. Each duplicate pair is displayed as a single card with both profiles side-by-side, the match reason prominently shown, and action buttons (Merge / Not a Duplicate) directly visible -- no clicking required to understand what is going on.

## Visual Layout

```text
+---------------------------------------------------------------+
| MATCHING: Same Phone (480-555-1234)                           |
+-----------------------------+---------------------------------+
|  [Avatar] Addey Lindsey    |  [Avatar] Addey X               |
|  addey@email.com           |  addeyx@email.com               |
|  480-555-1234  [match]     |  480-555-1234  [match]          |
|  12 visits  |  $450        |  0 visits  |  $0                |
+-----------------------------+---------------------------------+
|        [ Not a Duplicate ]          [ Merge Profiles ]        |
+---------------------------------------------------------------+
```

## Technical Details

### 1. New component: `src/components/dashboard/clients/DuplicatePairCard.tsx`

A self-contained card component that receives a duplicate client and its canonical client, shows them side-by-side with match highlights, and provides Merge / Dismiss actions inline.

- Two-column grid layout (responsive: stacks on mobile)
- Match reason badges prominently displayed in the card header
- Matching fields (phone, email) highlighted in amber
- Stats row (visits, spend, last visit) under each profile
- Footer with "Not a Duplicate" (with reason popover) and "Merge Profiles" buttons
- Clicking either profile opens the ClientDetailSheet

### 2. Modified: `src/pages/dashboard/ClientDirectory.tsx`

When `activeTab === 'duplicates'`, instead of rendering the standard flat row list:

- Group `processedClients` into pairs: each duplicate + its canonical forms one group
- Deduplicate pairs so the same pair does not appear twice (when both sides are in the list)
- Render each pair using `DuplicatePairCard` instead of the standard row
- Pass existing `handleDismissDuplicate` and merge navigation handlers through
- Keep pagination, search, and sorting functional

### 3. Pair grouping logic (in `useMemo`)

```typescript
// Group duplicates into pairs for the Duplicates tab
const duplicatePairs = useMemo(() => {
  if (activeTab !== 'duplicates') return [];
  const seen = new Set<string>();
  const pairs: Array<{ duplicate: Client; canonical: Client; reasons: string[] }> = [];
  
  for (const client of filteredClients) {
    if (client.is_duplicate && client.canonical_client_id) {
      const pairKey = [client.id, client.canonical_client_id].sort().join('-');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);
      const canonical = processedClients.find(c => c.id === client.canonical_client_id);
      if (canonical) {
        pairs.push({ duplicate: client, canonical, reasons: client.duplicateReasons });
      }
    }
  }
  return pairs;
}, [activeTab, filteredClients, processedClients]);
```

### 4. No changes to existing drilldown

The `DuplicateDrilldown` component and its expand-on-click behavior remain available for any non-duplicates-tab context (e.g., when a duplicate badge appears in the All tab). Only the Duplicates tab gets the new paired layout.

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/clients/DuplicatePairCard.tsx` | New component: side-by-side paired card with match highlights and inline actions |
| `src/pages/dashboard/ClientDirectory.tsx` | Add pair grouping logic; render `DuplicatePairCard` list when on Duplicates tab |

