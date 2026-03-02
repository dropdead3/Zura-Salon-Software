

## Increase Popover Dropdown Offset

The popover's `sideOffset` is currently `8px`, causing it to sit too close to the top bar. Increase it to `16px` to add breathing room between the trigger button and the dropdown card.

### Change

**`src/components/dashboard/ViewAsPopover.tsx`** — line 118: change `sideOffset={8}` to `sideOffset={16}`.

