

## Move Sync Status to Top-Right of Sales Card

The "No POS sales recorded yet today" label and the "Synced X ago" indicator are currently centered in the middle of the card below the expected badge. Moving them to the top-right corner of the inner card keeps the hero area clean and places operational status where operators expect it.

### Changes

**File: `src/components/dashboard/AggregateSalesCard.tsx`**

1. **Remove** the centered fallback block (lines 732-738) that renders the `actual_not_available` text and `LastSyncIndicator` inline in the hero area.

2. **Add** a top-right positioned sync status block inside the inner card container (line 613 area). When `isToday && !todayActual?.hasActualData`, render a compact row at the top-right with:
   - "No POS sales recorded yet today" as a small muted label
   - `LastSyncIndicator` with `syncType="sales"` and `showAutoRefresh`
   - Positioned using `absolute top-4 right-4` (the inner card container gets `relative`)

3. The layout will be a small stacked group: the text label on top, sync indicator below, all right-aligned.

