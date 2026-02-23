

## Make Search + Toggle Filter Bar Responsive

### Problem
The search bar and time-period toggle pill sit side-by-side in a single flex row. On smaller screens, they collide and overflow rather than stacking vertically. The toggle pill doesn't adapt for mobile.

### Changes

**File:** `src/components/dashboard/appointments-hub/AppointmentsList.tsx`

**1. Stack search and toggle on small screens**

Change the Row 1 container (currently line 250) from a horizontal-only flex to a responsive layout:
- Replace `flex flex-wrap gap-3 items-center` with `flex flex-col sm:flex-row gap-3 sm:items-center`
- This makes the search bar and toggle pill stack vertically on mobile and sit side-by-side on `sm` (640px+)

**2. Make the search bar full-width on mobile**

Update the search bar wrapper (line 251):
- Change `flex-1 min-w-0 max-w-[640px]` to `w-full sm:flex-1 sm:min-w-0 sm:max-w-[640px]`
- On mobile, the search bar takes full width; on desktop it flexes as before

**3. Make the toggle pill scrollable on mobile**

Update the toggle pill wrapper (line 255):
- Add `w-full sm:w-auto overflow-x-auto` so on mobile the toggle pill spans the full width and scrolls horizontally if needed
- Hide the scrollbar with a utility class for cleanliness

**4. Custom range popover alignment**

When stacked, the date range popover (line 266) should align to `start` on mobile to avoid clipping off-screen.

### Result
- **Mobile**: Search bar on top, toggle pill below (full width, horizontally scrollable if needed)
- **Desktop**: No change -- side-by-side layout preserved
- No new files or dependencies

