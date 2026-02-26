

## Add POS Sync Status Indicator to Sales Overview Card

When POS data hasn't synced for today, the card currently shows $0 with a vague message ("Actual revenue not available until appointments check out"). This needs to be replaced with a clear sync-status indicator that tells operators **why** data is missing and lets them trigger a sync.

### Changes

**File 1: `src/components/dashboard/AggregateSalesCard.tsx`**
- Import `LastSyncIndicator` from `@/components/dashboard/sales/LastSyncIndicator`
- Replace the existing fallback text at line 732-734 (`t('sales.actual_not_available')`) with a `LastSyncIndicator` component showing sync status + "Sync now" button
- Add a subtle banner/note above or below the $0 hero value when `isToday && !todayActual?.hasActualData` indicating "POS data not yet synced for today"

**File 2: `src/locales/en.json`**
- Update the `actual_not_available` string from "Actual revenue not available until appointments check out" to "POS data not yet synced for today" (or remove it in favor of the component)

**No other files changed.** The `LastSyncIndicator` component already exists with sync trigger, status display, and auto-refresh -- we just need to wire it into the Sales Overview card's today-mode fallback state.

### Result
- When POS has synced: card behaves as before (shows actual revenue, progress bar, etc.)
- When POS hasn't synced: card shows $0 with a clear "POS data not yet synced" indicator and a one-click "Sync now" button, so operators understand data is pending rather than assuming zero revenue

