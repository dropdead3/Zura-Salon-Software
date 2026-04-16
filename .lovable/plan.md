

# Fill Viewport: Dynamic Row Height Based on Available Space

## Problem
Row height is hardcoded at 24px for all zoom levels. At zoomed-out levels (e.g., -3 with 18 slots), the grid is only 432px tall, leaving ~600px of empty space below. The grid container already uses `flex-1 min-h-0` so it fills the viewport — but the content inside doesn't stretch to match.

## Solution
Calculate `ROW_HEIGHT` dynamically: measure the scroll container's height and divide by the number of time slots. Use a `min-height` of 24px so zoomed-in levels still scroll naturally.

```
ROW_HEIGHT = max(24, floor(containerHeight / totalSlots))
```

This means:
- **Zoomed out** (-3, 18 slots): rows stretch to fill (e.g., 1080/18 = 60px per row)
- **Zoomed in** (3, 144 slots): 24px minimum applies, grid scrolls as expected

## Changes

### `src/components/dashboard/schedule/DayView.tsx`

1. **Add container height measurement** — use `ResizeObserver` on `scrollRef` to track available height:
```ts
const [containerHeight, setContainerHeight] = useState(0);

useEffect(() => {
  if (!scrollRef.current) return;
  const observer = new ResizeObserver(([entry]) => {
    setContainerHeight(entry.contentRect.height);
  });
  observer.observe(scrollRef.current);
  return () => observer.disconnect();
}, []);
```

2. **Compute dynamic row height** — replace fixed `ROW_HEIGHT`:
```ts
const totalSlots = (hoursEnd - hoursStart) * (60 / slotInterval);
const MIN_ROW_HEIGHT = 24;
// Subtract ~56px for sticky header row
const availableHeight = containerHeight - 56;
const ROW_HEIGHT = Math.max(MIN_ROW_HEIGHT, Math.floor(availableHeight / totalSlots));
```

3. **Remove static rowHeight from ZOOM_CONFIG** — it only needs `interval` now:
```ts
const ZOOM_CONFIG: Record<string, { interval: number }> = {
  '-3': { interval: 60 },
  '-2': { interval: 60 },
  '-1': { interval: 30 },
  '0':  { interval: 20 },
  '1':  { interval: 15 },
  '2':  { interval: 10 },
  '3':  { interval: 5 },
};
```

**One file changed. Grid rows now auto-scale to fill the viewport at every zoom level.**

