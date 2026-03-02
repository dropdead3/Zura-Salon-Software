

## Fix Tab Toggle Padding in View As Popover

The `TabsList` in `ViewAsPopover.tsx` uses `h-9` which creates uneven padding around the tab buttons. The fix is to increase the height and adjust the inner padding for visual balance.

### Change

**`src/components/dashboard/ViewAsPopover.tsx`** — line 124:
- Change `TabsList` from `h-9` to `h-10` to give more vertical breathing room
- Change `TabsTrigger` items from `text-xs` to `text-xs py-1.5` for even internal padding
- Increase the container padding from `px-3 pt-3 pb-1` to `px-3 pt-3 pb-2`

This ensures the pill-shaped tab buttons have symmetrical padding on all sides within the toggle bar.

