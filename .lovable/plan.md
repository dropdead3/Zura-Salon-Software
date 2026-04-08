

# Fix Report Generator Header Responsiveness

## Problem

The `DashboardPageHeader` on the Reports Hub page has three action buttons (Report Pack, Date Picker, Location Select) that don't wrap on medium-sized screens. The `actions` div uses `flex shrink-0`, which prevents it from shrinking, causing the title ("REPORT GENERATOR") to be squeezed into a single-character-wide column where each letter stacks vertically.

## Root Cause

Two issues:
1. **`DashboardPageHeader.tsx` line 48**: `flex shrink-0` on the actions container prevents it from ever shrinking, so on `md` breakpoint the title gets zero width.
2. **`ReportsHub.tsx` line 96**: The three action items are in a non-wrapping `flex` row with fixed widths (`min-w-[200px]`, `w-[180px]`), totaling ~500px+ which leaves no room for the title.

## Fix

### File 1: `src/components/dashboard/DashboardPageHeader.tsx`
- Change actions container from `flex shrink-0` to `flex flex-wrap shrink-0` so items can wrap when space is tight. Also add `items-center gap-3` for consistent spacing when wrapped.

### File 2: `src/pages/dashboard/admin/ReportsHub.tsx`
- Change the actions wrapper from `flex items-center gap-3` to `flex flex-wrap items-center gap-3` so the three controls (Report Pack, Date Picker, Location Select) wrap to a second row on narrower screens instead of crushing the title.

Two file edits, both single-line changes.

