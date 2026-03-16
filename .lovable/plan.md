

# Fix Sticky Calculator on Backroom Paywall

## Problem
The right-column calculator has `sticky top-24` but it doesn't stick during scroll. The root cause is `items-start` on the parent grid container (line 352):

```
grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start
```

`items-start` in CSS Grid makes each column only as tall as its own content. Since the right column wrapper is the same height as the sticky child inside it, there's no scrollable space for `sticky` to activate. The sticky element needs its parent to be taller than itself.

## Fix — one line change in `BackroomPaywall.tsx`

Remove `items-start` from the grid container on line 352. The default `stretch` alignment will make the right column span the full row height (matching the left column), giving the sticky calculator room to stick as the user scrolls.

```diff
- <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
+ <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
```

No other changes needed — the sticky div already has `sticky top-24` and `max-h-[calc(100vh-8rem)] overflow-y-auto` for scroll containment.

