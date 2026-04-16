

# Set Default Zoom Level to 15-Minute View

## Change
One line in `src/pages/dashboard/Schedule.tsx`, line 122:

```ts
// Before
const [zoomLevel, setZoomLevel] = useState(0);

// After
const [zoomLevel, setZoomLevel] = useState(1);
```

This sets the default view to zoom level 1 (15-minute intervals) instead of level 0 (20-minute intervals), matching the Phorest reference screenshot.

