

## Extend Gradient + Add More Bottom Padding for Card Scroll

**Problem:** The gradient (`h-32`) isn't tall enough to visually separate the FAB from cards, and `pb-28` bottom padding on the scroll container isn't enough for cards to fully scroll above the gradient zone.

### Changes

**File: `src/components/dock/DockLayout.tsx` — line 104**

Increase gradient height from `h-32` to `h-44` (176px) for a taller fade zone that better covers the FAB area:

```tsx
<div className="absolute bottom-0 left-0 right-3 z-20 h-44 bg-gradient-to-t from-[hsl(var(--platform-bg))] to-transparent pointer-events-none" />
```

**File: `src/components/dock/schedule/DockScheduleTab.tsx` — line 167**

Increase bottom padding from `pb-28` to `pb-44` so the last cards can scroll fully above the gradient into clear view:

```tsx
<div ref={scrollRef} onScroll={checkScroll} className="h-full overflow-y-auto px-5 pb-44 space-y-8">
```

Two class changes across two files.

