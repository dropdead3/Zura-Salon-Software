

## Plan: Add Appointment Configurator from Schedule "+" Button

### Problem
The `+` button in the top-right of the Dock Schedule tab is non-functional — it renders but has no `onClick` handler.

### Approach
Create a new `DockNewBookingSheet` component — a mobile-optimized, multi-step booking form adapted for the Dock context. It will be a bottom sheet (using the existing `PremiumFloatingPanel` or a simple slide-up panel) with a simplified flow compared to the full dashboard `NewBookingSheet`.

### Steps

**1. Create `src/components/dock/schedule/DockNewBookingSheet.tsx`**
A slide-up panel with a 4-step wizard:
- **Client** — search existing clients by name/phone/email from `phorest_clients`
- **Service** — pick service(s) from `useServicesByCategory`, filtered by the logged-in staff member's qualifications
- **Date/Time** — date picker (defaults to today) + time slot selection
- **Confirm** — summary with client, service, time, price; confirm button calls `create-booking` edge function

Key details:
- Pre-selects the logged-in staff member (`staff.userId`) as the stylist
- Uses the same `create-booking` edge function that already exists
- Dark-themed to match the Dock platform theme
- Mobile-first layout with large touch targets

**2. Update `src/components/dock/schedule/DockScheduleTab.tsx`**
- Add `useState` for `showNewBooking` boolean
- Wire the `+` button's `onClick` to `setShowNewBooking(true)`
- Render `<DockNewBookingSheet>` conditionally
- On booking success, close the sheet and refetch appointments

### Data flow
```text
+ button → open sheet → client search (phorest_clients)
  → service pick (useServicesByCategory)
  → date/time select
  → confirm → invoke create-booking edge function
  → close sheet, invalidate dock-appointments query
```

### No database changes needed
Reuses existing `phorest_clients`, `phorest_services`, and the `create-booking` edge function.

