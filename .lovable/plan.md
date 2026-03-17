

# Add Proper Scrolling to Generating Preview Brand List

## Problem
The brand list in the "Generating Preview" modal (review phase) is cut off. Although a `ScrollArea` exists, it has a hard `max-h-[400px]` cap that doesn't leave enough room when many brands are listed.

## Fix
In `src/components/platform/backroom/BulkCatalogImport.tsx`, line 546:

Change the review-phase `ScrollArea` from:
```
max-h-[400px]
```
to:
```
max-h-[50vh]
```

This gives the list more vertical space within the dialog's `max-h-[85vh]` container, allowing users to scroll through all brands during generation/review. The `flex-1 min-h-0` classes already handle flex shrinking correctly — the max-height just needs to be larger.

