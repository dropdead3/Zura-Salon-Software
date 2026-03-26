

## Fix: Bowls scrolling out of view in Allowance Calculator

The dialog uses `flex flex-col` with `max-h-[90vh]`, but the Radix `ScrollArea` viewport doesn't reliably inherit flex height. When multiple bowls are added, content overflows past the dialog boundary instead of scrolling within the middle section.

### Root Cause

Radix `ScrollArea.Viewport` has `h-full w-full` but in a flex column context, the root `ScrollArea` with `flex-1 min-h-0` doesn't always propagate a concrete height to its children. The viewport ends up growing with content rather than constraining it.

### Fix

Replace `ScrollArea` with a plain `div` using `overflow-y-auto` and the same flex layout classes. The Radix ScrollArea component adds complexity (custom scrollbar styling) that isn't needed here and causes the height calculation issue.

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

**Line 1028:** Change:
```tsx
<ScrollArea className="flex-1 min-h-0 overflow-hidden relative">
```
to:
```tsx
<div className="flex-1 min-h-0 overflow-y-auto relative">
```

**Line 1514:** Change closing `</ScrollArea>` to `</div>`.

This ensures the scrollable area respects the flex container height and scrolls properly when bowls exceed the available space. The footer remains pinned at the bottom.

### Scope
- Single file change, 2 lines
- No logic changes, purely layout fix

