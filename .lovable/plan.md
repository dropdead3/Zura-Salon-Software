

# Right-Align Filters Across Backroom Sections

## Problem

The Overview section's location and time range filters (line 137 of `BackroomDashboardOverview.tsx`) are left-aligned using `flex flex-wrap items-center gap-2`. Every other section (Stations, Alerts, Compliance) already places filters in the right column of a `justify-between` header layout, which is consistent with the rest of the dashboard.

## Fix

**File: `BackroomDashboardOverview.tsx`** (line 137)

Change the filter container from:
```
flex flex-wrap items-center gap-2
```
to:
```
flex flex-wrap items-center justify-end gap-2
```

This adds `justify-end` so the location select, date select, and range label anchor to the right side, matching the established pattern across Stations, Compliance, and Alerts sections.

Single line change, one file.

