

## Problem

When the "View As" popover is open, the page content behind it remains fully visible, which is distracting. The user wants a backdrop overlay (blurred and darkened) similar to a dialog/modal effect.

## Plan

**File:** `src/components/dashboard/ViewAsPopover.tsx`

1. When `open` is true, render a full-screen backdrop overlay `div` behind the popover content. This overlay will have `bg-black/40 backdrop-blur-sm` to darken and blur the page content.

2. Place this overlay as a sibling inside the `Popover` component, rendered conditionally when `open` is true. It should be a fixed full-screen div with a high z-index (below the popover content's z-50 but above everything else), e.g. `fixed inset-0 z-40`.

3. Clicking the overlay should close the popover by calling `setOpen(false)`.

### Change

After the `</Tooltip>` closing tag (~line 114) and before `<PopoverContent>`, add:

```tsx
{open && (
  <div
    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
    aria-hidden="true"
    onClick={() => setOpen(false)}
  />
)}
```

This gives the same darkened + blurred backdrop effect as a dialog overlay, focusing attention on the popover.

