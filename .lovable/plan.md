
# Fix Duplicates Tab to Show Both Records in a Pair

## Problem
The Duplicates tab count shows "1" and only displays the record flagged as `is_duplicate`. The canonical (original) profile that the duplicate points to is not included, even though both are part of the same duplicate pair. Both should appear.

## Root Cause
Three filter expressions only check `is_duplicate === true`, missing canonical profiles that have a `_linkedDuplicateId` set.

## Changes (single file: `src/pages/dashboard/ClientDirectory.tsx`)

### 1. Stats computation (~line 466)
Change the duplicates count from:
```
active.filter(c => (c as any).is_duplicate === true).length
```
to:
```
active.filter(c => (c as any).is_duplicate === true || (c as any)._linkedDuplicateId).length
```

### 2. Tab filter -- first occurrence (~line 300)
Change:
```
filtered = filtered.filter(c => (c as any).is_duplicate === true);
```
to:
```
filtered = filtered.filter(c => (c as any).is_duplicate === true || (c as any)._linkedDuplicateId);
```

### 3. Tab filter -- second occurrence (~line 407)
Same change as above for the parallel filter path.

These three one-line edits ensure both the duplicate and its canonical counterpart appear in the Duplicates tab and are reflected in the count badge.
