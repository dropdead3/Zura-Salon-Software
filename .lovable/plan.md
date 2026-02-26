

## Clean up Sales Overview card layout and corner elements

### Problems identified from the screenshot

1. **"No POS sales recorded yet today" + sync indicator** are absolutely positioned in the top-right of the inner card, floating disconnected from the content and creating visual asymmetry (content centered, status stuck in corner).

2. **"All locations combined"** label is a tiny line in the top-left, creating an unbalanced header area above the highlight box.

3. These two elements occupy the same row visually but are positioned independently (one is flow, one is absolute), causing the inner card to feel lopsided with wasted space.

### Solution

Restructure the top of the inner card into a single **flex row**: location label on the left, sync status on the right. Remove the absolute positioning on the sync status. This creates a clean, balanced header before the highlight box.

### Changes

**File: `src/components/dashboard/AggregateSalesCard.tsx`**

**1. Replace the absolute-positioned sync block (lines 614-619) and the location label (lines 621-643) with a single flex row:**

```tsx
{/* Header row: location label left, sync status right */}
<div className="flex items-start justify-between gap-4 mb-2">
  <p className="text-xs text-muted-foreground flex items-center gap-1.5 min-w-0">
    <span>{isAllLocations ? t('sales.all_locations') : selectedLocationName || tc('loading')}</span>
    {/* ...existing closed-locations logic unchanged... */}
  </p>
  {isToday && !todayActual?.hasActualData && (
    <div className="flex flex-col items-end gap-0.5 shrink-0">
      <p className="text-[10px] text-muted-foreground/60">{t('sales.actual_not_available')}</p>
      <LastSyncIndicator syncType="sales" showAutoRefresh />
    </div>
  )}
</div>
```

This removes the `absolute` positioning, eliminates the disconnected corner placement, and creates a balanced top bar. The highlight box below will then sit symmetrically within the remaining space.

### Files changed
- `src/components/dashboard/AggregateSalesCard.tsx` (1 structural edit in the inner card header area)

