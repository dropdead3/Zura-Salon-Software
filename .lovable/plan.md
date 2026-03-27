

## Make Color Bar Nav Rail Collapsible

### Problem
The left navigation rail in the Color Bar hub consumes a fixed 224px (`w-56`) at all times, leaving less room for the content area — especially on the user's 1188px viewport where the main sidebar already takes ~224px.

### Changes

**File: `src/pages/dashboard/admin/ColorBarSettings.tsx`**

1. **Add collapse state** — `useState` with `localStorage` persistence (key: `color-bar-nav-collapsed`)

2. **Replace fixed `w-56` nav** with a conditional layout:
   - **Expanded** (`w-56`): Current full nav with labels, group headers, icons — plus a collapse toggle button (e.g., `PanelLeftClose` icon) at the top
   - **Collapsed** (`w-12`): Icon-only rail showing just the section icons with tooltips on hover, plus an expand toggle button (`PanelLeftOpen` icon)

3. **Collapse toggle button**: Place at the top of the nav, right-aligned. Uses `PanelLeftClose` when expanded, `PanelLeftOpen` when collapsed.

4. **Collapsed state rendering**:
   - Skip group labels and dividers — just render icons vertically with `gap-1`
   - Each icon button gets a `title` attribute (or Tooltip) showing the section label
   - Active section highlighted with `bg-muted` ring
   - Group dividers rendered as thin `h-px` spacers

5. **Transition**: Add `transition-all duration-200` on the nav container for smooth width change

### Result
- Users can collapse the nav rail to a narrow icon strip, giving the Service Tracking table (and all content sections) significantly more horizontal space
- State persists across page loads
- Tooltips ensure discoverability in collapsed mode

