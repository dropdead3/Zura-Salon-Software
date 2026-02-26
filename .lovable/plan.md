

## Conditionally show trend indicator only after day is finalized

**Problem**: The trend indicator compares today's partial sales to yesterday's full-day sales, making it almost always appear negative during the day. This is misleading and creates unnecessary alarm.

**Solution**: Only render the `SalesTrendIndicator` when `isToday` is false OR when `allAppointmentsComplete` is true (the day is finalized). During an active business day, the trend is suppressed entirely.

### Change

**File: `src/components/dashboard/AggregateSalesCard.tsx` (line 793)**

```tsx
// Before
{showTrendIndicators && (

// After
{showTrendIndicators && (!isToday || allAppointmentsComplete) && (
```

Single line change. When viewing yesterday, last week, etc., the trend shows as normal. When viewing today, it only appears once all appointments are complete or operating hours have passed.

