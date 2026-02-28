

## Problem

The editor iframe renders at whatever pixel width the canvas panel actually occupies (roughly 600-800px depending on sidebar widths). The site inside the iframe responds to that narrow width, triggering tablet/mobile breakpoints — fewer nav links, stacked layouts, etc. You're seeing a "responsive" view instead of a true full-desktop preview.

## Solution

For desktop viewport mode, render the iframe at a fixed intrinsic width of **1440px** and CSS-scale it down to fit the available container. This is the standard approach used by website builders (Webflow, Squarespace, etc.) to show a full-width desktop preview inside a narrower panel.

### Changes in `CanvasPanel.tsx`

1. **Measure the container width** using a `ResizeObserver` on the canvas surface `div`.

2. **For desktop mode**: Set the iframe wrapper to a fixed `width: 1440px` and apply `transform: scale(containerWidth / 1440)` with `transform-origin: top left`. Set the wrapper height to `containerHeight / scale` so the iframe fills the visible area. Remove `max-w-[1280px]` constraint for desktop.

3. **For tablet/mobile modes**: Keep the current behavior (constrained max-width, no scaling override) since those modes intentionally show responsive layouts.

4. **Combine with zoom**: The existing zoom control (`fit`, `100%`, `75%`) multiplies with the desktop scale. `fit` = auto-scale to container. `100%` = no scaling (shows scrollbars if needed). `75%` = 0.75x.

### Implementation detail

```tsx
// New: measure container
const containerRef = useRef<HTMLDivElement>(null);
const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  const ro = new ResizeObserver(([entry]) => {
    setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
  });
  ro.observe(el);
  return () => ro.disconnect();
}, []);

// Desktop: fixed 1440px width, scaled to fit
const DESKTOP_WIDTH = 1440;
const isDesktop = viewportMode === 'desktop';
const fitScale = isDesktop && containerSize.w > 0
  ? Math.min(containerSize.w / DESKTOP_WIDTH, 1)
  : 1;
const effectiveScale = isDesktop ? fitScale * (zoomLevel === '75' ? 0.75 : zoomLevel === '100' ? 1 : 1) : ZOOM_SCALES[zoomLevel];

// For desktop, override zoom "fit" to mean auto-scale, "100%" to mean true 1440px
```

The iframe wrapper for desktop gets:
```tsx
style={{
  width: isDesktop ? `${DESKTOP_WIDTH}px` : undefined,
  height: isDesktop ? `${containerSize.h / effectiveScale}px` : undefined,
  transform: `scale(${effectiveScale})`,
  transformOrigin: 'top left',
}}
```

This ensures the site always renders as if viewed at 1440px wide, with all nav links visible and full desktop layout, regardless of how narrow the editor panel actually is.

