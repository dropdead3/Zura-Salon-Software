
# Remove Redundant Status Dropdown from Appointment Detail Header

## Problem
The appointment detail panel has a status dropdown near the top (below the client name) that duplicates the exact same status transition buttons already present in the footer action bar. This adds visual clutter without providing additional value.

## Solution
Remove the interactive status dropdown from the header area (lines 696-718) and replace it with a **static, read-only status badge** so the user can still see the current status at a glance -- without the dropdown trigger and transition options.

The contextual badges (Redo, Recurrence, New Client) that sit alongside the status badge will remain untouched.

## Technical Details

**File:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

**Change (lines 696-723):** Replace the conditional DropdownMenu/Badge block with a single static Badge that always renders the current status (icon + label) without any interactive dropdown. This removes the `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, and `DropdownMenuItem` elements from the header section entirely.

The footer action bar (line 1292+) remains unchanged and continues to serve as the single point for all status transitions (Confirm, Check In, Pay, Complete, No Show, Cancel).
