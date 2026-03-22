

## Add Top Padding to Scroll Content for Gradient Clearance

**Problem:** The top gradient overlay (`h-12`) covers the first section header and card content because the scroll container has no top padding to offset it.

### Change — `src/components/dock/schedule/DockScheduleTab.tsx`

Line 243: Add `pt-12` to the scroll container to match the gradient height, pushing content below the fade zone:

```tsx
<div ref={scrollRef} onScroll={checkScroll} className="h-full overflow-y-auto px-5 pt-12 pb-56 space-y-8">
```

Single class addition, one line.

