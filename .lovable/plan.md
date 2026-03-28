

## Move "Take Action" Button Outside Pipeline Container

### Problem
The "Take Action" button currently sits inside the pipeline health container (`bg-card-inner rounded-lg border`), making the row feel cramped. The user wants it placed outside to the right of the container, matching its height and border radius for a cleaner side-by-side layout.

### Solution
Wrap the pipeline `<Link>` container and the "Take Action" button in a `flex` row. The button moves from inside the `<Link>` to a sibling element beside it, matching the container's height and radii.

### File modified
**`src/components/dashboard/NewBookingsCard.tsx`**

#### Layout change (lines 96-135)
- Wrap the pipeline section in a `<div className="flex gap-2 mb-4">` container
- The `<Link>` keeps its existing styles but gains `flex-1` to fill available space; remove `mb-4` (parent handles margin now)
- Remove the `Take Action` button from inside the `<Link>`
- Add the button as a sibling after the `</Link>`, only rendered when `showPipelineAction` is true
- Button styling: `self-stretch rounded-lg bg-destructive/20 border border-destructive/70 text-destructive hover:bg-destructive/30 px-4 text-xs font-sans gap-1.5 cursor-pointer transition-all active:scale-[0.97] flex items-center`
- This ensures the button matches the container's height (via `self-stretch`) and uses the same `rounded-lg` radius

#### Content inside the Link
- Remove the `Take Action` button and its conditional block (lines 114-128)
- The pipeline label, dot, info tooltip, and trailing count remain unchanged inside the Link

