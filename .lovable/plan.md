

## Apply Full-Width Expansion Row Pattern to Announcements

### Problem
The Announcements card currently opens inline within the control row's left cluster (visible in the screenshot), pushing controls sideways — the same issue we just fixed for Insights.

### Approach
Follow the exact same split pattern used for AIInsightsDrawer: separate the trigger button from the panel content, lift expansion state to CommandCenterControlRow, and render the panel as a full-width expansion row beneath controls.

### Files Changed

| File | Action |
|------|--------|
| `src/components/dashboard/AnnouncementsDrawer.tsx` | Split into trigger + panel; add `expanded`/`onToggle` controlled mode; export `AnnouncementsPanel` |
| `src/components/dashboard/CommandCenterControlRow.tsx` | Add `announcementsExpanded` state; render `AnnouncementsPanel` in expansion row below controls |

### Changes

**1. AnnouncementsDrawer.tsx**
- Add `expanded?: boolean` and `onToggle?: () => void` props
- When `onToggle` is provided (controlled mode), render only the collapsed trigger button with chevron state (up/down) and active ring styling when expanded
- Move all expanded card content (header, announcement list, footer) into a new exported `AnnouncementsPanel` component
- `AnnouncementsPanel` receives `onClose`, `isLeadership` props and contains the existing card UI (location filter, announcement list, footer link)
- Panel uses same glass card styling: `rounded-xl shadow-lg border border-border/40 bg-card`, `max-h-[65vh] overflow-y-auto` for internal scroll
- Escape key closes panel
- Keep all existing data hooks (query, realtime, mark-as-read, auto-expand) inside the panel
- Unread badge remains on the trigger button

**2. CommandCenterControlRow.tsx**
- Import `AnnouncementsPanel` from AnnouncementsDrawer
- Add `announcementsExpanded` state + `toggleAnnouncements` / `closeAnnouncements` callbacks
- When Insights opens, close Announcements (and vice versa) — only one expansion row open at a time
- Pass `expanded` and `onToggle` to `AnnouncementsDrawer` trigger
- Render `AnnouncementsPanel` inside the same `AnimatePresence` block, using the identical `motion.div` height animation (0→auto, 250ms, ease `[0.4, 0, 0.2, 1]`)
- Panel wrapped in `pt-3` container matching Insights placement

### Mutual Exclusion
Only one expansion row (Insights or Announcements) can be open at a time. Opening one closes the other. This prevents the expansion area from stacking two panels.

