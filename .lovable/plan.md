

## Remove Decorative LayoutGrid Icon from Scheduler Header

### Problem
The `LayoutGrid` icon (the 2×2 grid squares) next to the Day/Week toggle in the scheduler's dark header bar is non-interactive and serves no functional purpose. It's visual clutter.

### Fix
**1 file**: `src/components/dashboard/schedule/ScheduleHeader.tsx`

- **Line 131**: Remove `<LayoutGrid className="h-4 w-4 text-[hsl(40,20%,92%)]/60" />`
- Clean up the `LayoutGrid` import from lucide-react
- The Day/Week pill toggle remains unchanged

