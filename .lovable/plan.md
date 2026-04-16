
The bug is in the wrong component.

On the Schedule page, the location dropdown is not `LocationGroupSelect`. The actual control is the Radix `Select` inside `src/components/dashboard/schedule/ScheduleHeader.tsx`. That means the earlier `LocationGroupSelect.tsx` changes would not affect this screen at all. Search also shows `LocationGroupSelect` is used elsewhere (like Payment Ops), not in this schedule header.

## Plan

### Diagnosis
- The schedule location filter is this block in `ScheduleHeader.tsx`:
  - `<Select value={selectedLocation} onValueChange={onLocationChange}>`
- It currently has:
  - no controlled `open` state
  - no `onMouseLeave` close logic
  - a shared `SelectContent` wrapper that adds a small bottom translate (`data-[side=bottom]:translate-y-1`), which creates a tiny gap and can make hover-off closing feel inconsistent

### Fix
In `src/components/dashboard/schedule/ScheduleHeader.tsx`:

1. Add local `locationSelectOpen` state.
2. Make the location `Select` controlled with:
   - `open={locationSelectOpen}`
   - `onOpenChange={setLocationSelectOpen}`
3. Add a short close-delay hover controller for the location filter only:
   - `onMouseEnter` clears any pending close
   - `onMouseLeave` schedules `setLocationSelectOpen(false)`
4. Attach those handlers to both:
   - `SelectTrigger`
   - `SelectContent`
5. Override the content offset for this one dropdown with:
   - `className="data-[side=bottom]:translate-y-0"`
   so there is no dead zone between trigger and menu
6. Keep click-to-open behavior exactly the same, and still close on selection

### Why this is the right fix
- It targets the actual schedule location dropdown
- It matches the intended UX: visible after click, stays open while hovered, closes when the mouse leaves
- It avoids changing all `Select` components globally
- It is more reliable than only adding `onMouseLeave`, because it handles the trigger/content transition and removes the small gap

### Files to touch
- `src/components/dashboard/schedule/ScheduleHeader.tsx`

### Out of scope
- No global changes to `src/components/ui/select.tsx`
- No changes to `src/components/ui/LocationGroupSelect.tsx`
- No visual redesign, spacing, or label changes
