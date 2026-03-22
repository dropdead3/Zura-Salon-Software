

## Add Top and Bottom Blur Fade Overlays to Scroll Container

**Problem:** Cards have no visual transition when approaching the header or the bottom nav — they appear/disappear abruptly at both edges.

### Changes — `src/components/dock/schedule/DockScheduleTab.tsx`

Inside the scroll wrapper (`div` on line 225, the `relative flex-1 min-h-0` container), add two absolute-positioned gradient overlays:

**1. Top fade overlay** — fades cards into the background as they scroll up toward the header:
```tsx
<div className="absolute top-0 left-0 right-0 h-12 z-10 pointer-events-none"
  style={{
    background: 'linear-gradient(to bottom, hsl(var(--platform-bg)), transparent)',
  }}
/>
```

**2. Bottom fade overlay** — fades cards as they approach the bottom nav area. This replaces or supplements the existing `h-52` gradient in `DockLayout.tsx` (line 104) with a scroll-container-local version for tighter visual coupling:
```tsx
<div className="absolute bottom-0 left-0 right-0 h-16 z-10 pointer-events-none"
  style={{
    background: 'linear-gradient(to top, hsl(var(--platform-bg)), transparent)',
  }}
/>
```

The existing `DockLayout.tsx` bottom gradient (line 104) stays as-is since it covers the nav area itself. The new bottom fade inside the scroll wrapper handles the content-to-gradient transition zone.

Two elements added, one file.

