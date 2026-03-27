

## Stack Tracking & Billing Columns on Narrower Screens

### Problem
Inside the expanded service detail row, the "Tracking" and "Billing Method" sections sit side-by-side via `grid-cols-1 md:grid-cols-2`. With the sidebar consuming ~260px, the content area at a 1300px viewport is ~1040px — still above the `md:768px` breakpoint, so both columns render side-by-side but cramped. The billing method pills and vessel toggles compete for space.

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

1. **Raise the two-column breakpoint** (line ~886): Change `grid grid-cols-1 md:grid-cols-2` to `grid grid-cols-1 lg:grid-cols-2` so the Tracking and Billing sections stack vertically until the `lg` (1024px) breakpoint, giving each section full width on medium screens.

### Result
- At the user's 1300px viewport (with sidebar), Tracking and Billing stack vertically with full-width breathing room
- On wider screens (1024px+ content area), they return to side-by-side
- Single line change, no structural rework needed

