
# Add Spacing Below Card Header in Duplicates View

## Problem

The "96 DUPLICATE PAIRS" header row (title + sort buttons) sits too close to the first duplicate pair card's "MATCHING:" bar. The `CardHeader` currently uses `pb-0` which removes all bottom padding.

## Fix

**File: `src/pages/dashboard/ClientDirectory.tsx` (line 919)**

Change `CardHeader className="pb-0"` to `CardHeader className="pb-4"` to restore standard bottom padding (16px) between the header and the card content below it.

This is a single class change on one line.
