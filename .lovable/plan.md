

## Fix Zura Insights: Full-Width Expansion Row Beneath Controls

### Problem
AIInsightsDrawer (and PersonalInsightsDrawer) currently render their expanded panel inline within the control row's left cluster, pushing controls sideways and breaking layout.

### Architecture Change

Separate the **trigger button** from the **expansion panel**. The trigger stays in the control row; the panel renders as a full-width row beneath it.

### Files Changed

| File | Action |
|------|--------|
| `src/components/dashboard/AIInsightsDrawer.tsx` | Split into trigger + panel; expose `expanded`/`onToggle` props; panel renders full-width |
| `src/components/dashboard/PersonalInsightsDrawer.tsx` | Same split pattern as AIInsightsDrawer |
| `src/components/dashboard/CommandCenterControlRow.tsx` | Manage expanded state; render trigger in row, panel below as expansion row |

### Structural Layout (After)

```text
┌─────────────────────────────────────────────────┐
│ Controls Row: [Insights▾] [Announce] [Live]  …  │  ← stable, never shifts
├─────────────────────────────────────────────────┤
│ Insights Expansion Row (full-width, collapsible) │  ← animates height open/close
│ ┌─────────────────────────────────────────────┐ │
│ │  Glass bento card, rounded-xl, p-6, shadow  │ │
│ │  max-h-[65vh] internal scroll               │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ Dashboard Grid                                   │  ← shifts down smoothly
└─────────────────────────────────────────────────┘
```

### Detailed Changes

**1. AIInsightsDrawer.tsx**
- Add optional props: `expanded?: boolean`, `onToggle?: () => void`
- When `onToggle` is provided, the component operates in "controlled" mode
- Split rendering: when collapsed, render only the `SilverShineButton` trigger (with chevron state: `ChevronDown` when closed, `ChevronUp` when open)
- Export a new `AIInsightsPanel` component that contains just the expanded content (the glass card with tabs, insights, guidance, etc.)
- Panel uses `motion.div` with height animation: `initial={{ height: 0, opacity: 0 }}` → `animate={{ height: 'auto', opacity: 1 }}` with `duration: 0.25, ease: [0.4, 0, 0.2, 1]`
- Panel wrapper: `overflow-hidden` during animation, `rounded-xl shadow-lg border border-border/40 bg-card`
- Internal scroll: `max-h-[65vh] overflow-y-auto` on content area
- Escape key closes panel
- Active button state: subtle accent background when expanded

**2. PersonalInsightsDrawer.tsx**
- Same controlled-mode pattern: `expanded?`, `onToggle?`, separate `PersonalInsightsPanel`
- Identical animation and layout rules

**3. CommandCenterControlRow.tsx**
- Add `insightsExpanded` state
- Pass `expanded` and `onToggle` to AIInsightsDrawer/PersonalInsightsDrawer triggers
- After the controls row `div`, render `AnimatePresence` with the corresponding panel component
- Panel is wrapped in a full-width container that respects parent padding
- Uses `motion.div` with `layout` for smooth push-down of content below
- No z-index hacks — panel is in normal document flow
- Props interface unchanged (no breaking changes to DashboardHome)

### Animation Spec

- **Open**: Height 0→auto + opacity 0→1, 250ms, `ease-in-out`
- **Close**: Reverse, 220ms
- **Content below**: Shifts naturally via document flow (no explicit animation needed — the expansion row height change handles it)
- No spring, no bounce, no elastic
- `overflow: hidden` on the animating container to prevent content flash

### Interaction Details

- Clicking trigger toggles `insightsExpanded`
- Close icon (X) in panel header closes
- Escape key closes
- Active state on trigger: `bg-accent/50` border highlight when open
- Chevron rotates: down when closed, up when open

### Responsive Behavior

- Panel stays full-width at all breakpoints
- At narrow widths, panel content scrolls internally (max-h-[65vh])
- Never becomes a side panel or inline card

