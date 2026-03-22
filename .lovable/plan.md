

## Fix Scroll Indicator Z-Index + Glass Floating Bottom Nav

### Problem
1. The scroll-down chevron indicator sits inside the scroll container's `relative` wrapper but gets clipped or hidden behind the bottom nav
2. The content area has `pb-20` padding to avoid the bottom nav, creating dead space instead of letting cards flow edge-to-edge
3. The bottom nav is a static flex child, not floating over content

### Changes

**File: `src/components/dock/DockLayout.tsx`**

1. **Remove `pb-20` from content area** (line 71) — cards will now extend to the bottom edge
2. **Make bottom nav absolutely positioned** at the bottom of the container, floating over cards with a glass effect:
   - `absolute bottom-0 inset-x-0 z-30` positioning
   - The nav already has `backdrop-blur-xl` and semi-transparent bg (`bg-[...]/0.75`), so it already looks glassy — just needs to float

**File: `src/components/dock/schedule/DockScheduleTab.tsx`**

3. **Raise scroll indicator z-index** — add `z-20` to the scroll indicator wrapper (line 192) so it renders above card content
4. **Add bottom padding to scroll list** — replace `pb-6` with `pb-28` on the scroll container (line 167) so the last cards aren't permanently hidden behind the floating nav

**File: `src/components/dock/DockBottomNav.tsx`**

5. **No structural changes needed** — the nav already has `backdrop-blur-xl` and `bg-[...]/0.75` for the glass effect. It just needs to be positioned absolutely by its parent.

### Layout After Fix

```text
┌─────────────────────────┐
│  Header                 │
│  Toggle                 │
│  ┌───────────────────┐  │
│  │  Cards scroll     │  │
│  │  all the way      │  │
│  │  to bottom        │  │
│  │  ...              │  │
│  │      ↓ chevron    │  │ ← z-20, above cards
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │ ← glass nav floats over
│  └───────────────────┘  │
└─────────────────────────┘
```

