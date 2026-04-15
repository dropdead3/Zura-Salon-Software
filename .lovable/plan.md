

# Fix: Staff Filter Label to Show "All Stylists With Appointments"

## Problem
When the "All Stylists With Appointments" option is selected in the dropdown, the toggle button only displays "All Stylists" — the label should match the full option text.

## Fix — 1 line in `src/components/dashboard/schedule/ScheduleHeader.tsx`

**Line 342:** Change `'All Stylists'` to `'All Stylists With Appointments'`

```tsx
// Before
{selectedStaffIds.length === 0 
  ? 'All Stylists' 

// After
{selectedStaffIds.length === 0 
  ? 'All Stylists With Appointments' 
```

Single string change. The `max-w-[280px]` already set on the button comfortably fits this text.

