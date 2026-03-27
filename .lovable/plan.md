

# Conditionally Hide Zero-Assistant Count in Live Session Indicator

## Problem
The indicator always shows "7 stylists, 0 assistants in service now" even when there are zero assistants. It should omit the assistant portion entirely when count is 0.

## Change

**File:** `src/components/dashboard/LiveSessionIndicator.tsx` (line 70-72)

Update the text interpolation logic:

- **Full mode:** Show `"7 stylists in service now"` when `activeAssistantCount === 0`, otherwise `"7 stylists, 2 assistants in service now"`
- **Compact mode:** Keep `"${total} in service"` as-is (already fine)

```tsx
{compact
  ? `${activeStylistCount + activeAssistantCount} in service`
  : activeAssistantCount > 0
    ? `${activeStylistCount} stylists, ${activeAssistantCount} assistants in service now`
    : `${activeStylistCount} stylists in service now`}
```

Single line change, no new files.

