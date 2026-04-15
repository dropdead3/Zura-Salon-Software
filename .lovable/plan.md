

## Conditionally Show Today's Prep Icon for Service Providers Only

### Change
Wrap the "Today's Prep" button (lines 359-375) in the `isServiceProvider` prop check, which is already passed to `ScheduleHeader`.

### Scope
**1 file**: `src/components/dashboard/schedule/ScheduleHeader.tsx`

### Implementation
Change line 360 from:
```tsx
{isOrgToday(currentDate) && (
```
to:
```tsx
{isServiceProvider && isOrgToday(currentDate) && (
```

This ensures the clipboard/prep icon only renders for service providers (stylists), not for admin-only roles like front desk or managers who don't need personal prep views.

