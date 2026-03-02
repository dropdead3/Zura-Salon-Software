

## Fix Roles List Cutoff and Add Visible Scrollbar

The `ScrollArea` on the Roles tab has `max-h-[360px]` which is too short to show all role categories. The fix:

### Changes

**`src/components/dashboard/ViewAsPopover.tsx`**

1. **Increase scroll area height** — Change `max-h-[360px]` (line 142) to `max-h-[420px]` so more roles are visible before scrolling kicks in
2. **Ensure overflow works** — Add `overflow-y-auto` alongside the max-height so the native scrollbar appears when content exceeds the container. The `ScrollArea` component already renders a `ScrollBar` via Radix, but the `max-h` class needs to be on a wrapper that actually constrains height for the viewport to scroll. Wrap the content area properly so the Radix viewport respects the constraint.

Specifically:
- Line 142: change `max-h-[360px]` to `max-h-[420px]` on the Roles tab `ScrollArea`
- Line 190: change `max-h-[320px]` to `max-h-[380px]` on the Team tab `ScrollArea` for consistency

This gives both tabs more vertical real estate while still constraining within screen bounds, and the existing `ScrollBar` component (with `forceMount`) will display when content overflows.

