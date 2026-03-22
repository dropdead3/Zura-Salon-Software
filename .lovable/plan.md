

## Add Scroll-Down Indicator Arrow

**File:** `src/components/dock/schedule/DockScheduleTab.tsx`

When the appointment list overflows, show a subtle animated chevron-down arrow near the bottom of the scroll area. It fades out once the user scrolls to the bottom.

### Changes

1. **Import** `useRef`, `useEffect`, `useCallback` from React; `ChevronDown` from lucide-react.

2. **Add scroll state tracking** — attach a `ref` to the scrollable div (line 88). Track a `showScrollIndicator` boolean via `useState`. On mount and on scroll, check if `scrollHeight > clientHeight` and `scrollTop + clientHeight < scrollHeight - 20`. Update the boolean accordingly.

3. **Render indicator** — Below the scrollable div (but inside the relative container), render a fixed-position gradient overlay + animated bouncing chevron arrow. Only visible when `showScrollIndicator` is true. Fade transition via opacity.

```text
┌─────────────────────────┐
│  Header                 │
│  ───────────────────     │
│  Active (2)             │
│  [Card]                 │
│  [Card]                 │
│  Scheduled (3)          │
│  [Card]    ← clipped    │
│  ▼▼▼ gradient + arrow ▼▼│  ← indicator overlay
├─────────────────────────┤
│  Bottom Nav             │
└─────────────────────────┘
```

The indicator is a `pointer-events-none` overlay positioned at the bottom of the scroll area with:
- A gradient from transparent to the platform background color
- A small bouncing `ChevronDown` icon centered
- Smooth opacity transition (visible when not scrolled to bottom, hidden when at bottom)

Single file change, no logic changes to appointments.

