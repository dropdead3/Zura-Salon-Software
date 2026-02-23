

# Visual Duplicate Pairing in Client Directory

## Problem
When two duplicate clients appear in the directory (e.g., "Eric Day" x2), only the record flagged as `is_duplicate` shows a badge. The original (canonical) profile shows no visual indicator, making it unclear these are duplicates of each other.

## Solution
Add a duplicate indicator badge to canonical profiles that have a known duplicate pointing to them. The data is already computed (`duplicateReasons` and `_linkedDuplicateId` are populated for canonical profiles in the processing step), but the UI only renders a badge when `_linkedReason` is set (which only happens during search expansion). We need to also render a badge when `_linkedDuplicateId` is present.

Additionally, add a subtle left-border accent (amber) to both duplicate and canonical rows in a pair, making them visually grouped even when scanning quickly.

## File Change: `src/pages/dashboard/ClientDirectory.tsx`

### 1. Add badge for canonical profiles with duplicates (after the existing `_linkedReason` badge, ~line 866)
Add a new conditional badge that renders when a client has `_linkedDuplicateId` set but is NOT itself a duplicate and does NOT have `_linkedReason` (to avoid double-badging):

```
{!client.is_duplicate && !client._linkedReason && client._linkedDuplicateId && (
  <Badge variant="outline" className="...amber styling... gap-1 cursor-pointer">
    <GitMerge /> Duplicate Match (Same Phone / Same Email / etc.)
  </Badge>
)}
```

Clicking this badge will toggle the duplicate drilldown, same as the existing duplicate badge.

### 2. Add amber left-border accent to duplicate-pair rows (~line 795)
Add a `border-l-2 border-l-amber-500/60` class to any row where the client is a duplicate, has a `_linkedDuplicateId`, or has a `_linkedReason`. This creates a subtle visual grouping stripe.

### 3. Enable drilldown for canonical profiles (~line 1002)
Currently the drilldown only expands when the client has `canonical_client_id`. For canonical profiles, expand to show the duplicate profile instead (using `_linkedDuplicateId`).

## Technical Detail

The processing at lines 207-221 already computes `duplicateReasons` and `_linkedDuplicateId` for canonical profiles. The changes are purely in the render section:
- Line ~795: Add conditional left border class
- Line ~857-866: Add a new badge block for canonical profiles
- Line ~1002: Allow drilldown for canonical profiles using `_linkedDuplicateId`
- Merge CTA: The existing merge button at line 959 already handles `_linkedReason` but not bare `_linkedDuplicateId` -- add that condition too

