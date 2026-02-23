

## Add "Appointments & Transactions" Link to Schedule

Two link buttons that navigate to `/dashboard/appointments-hub`, giving front desk, managers, and admins quick access to transaction data, refunds, and appointment history.

### 1. Schedule Bottom Action Bar (`ScheduleActionBar.tsx`)

Add a `Receipt` icon button (from lucide-react) to the right side of the bar, just before the Schedule Legend. It will be a small pill-shaped link using `react-router-dom`'s `Link` component, styled consistently with the existing bar aesthetic:

- Icon-only button with a tooltip ("Appointments & Transactions")
- Placed between the payment queue bubbles and the legend
- Uses `Receipt` icon to match the hub's existing icon in the nav config

### 2. Appointment Detail Sheet (`AppointmentDetailSheet.tsx`)

Add a "View in Transactions" link button inside the detail sheet footer/action area. This lets users jump directly from a specific appointment to the full hub view:

- Small outline button with `Receipt` icon + "Transactions" label
- Links to `/dashboard/appointments-hub`
- Positioned in the sheet's action/footer area alongside existing action buttons

### Files Changed

- `src/components/dashboard/schedule/ScheduleActionBar.tsx` -- Add Receipt icon link button before the legend
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` -- Add "Transactions" link button in the detail sheet

### Technical Details

- Import `Link` from `react-router-dom` and `Receipt` from `lucide-react`
- Bottom bar button: `Link to="/dashboard/appointments-hub"` wrapped in a `Tooltip`, styled as a ghost icon button (`h-8 w-8 rounded-full`) to match the bar's pill design
- Detail sheet button: Small outline `Button` with `asChild` wrapping a `Link`, using `tokens.button.inline` sizing
- No new dependencies or database changes required

