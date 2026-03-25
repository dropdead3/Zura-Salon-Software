

## Enhance Service Tracking Drill-Down UX

Three improvements: animated expand/collapse, inline config summary for tracked services, and touch gesture support.

### 1. Animated Expand/Collapse with framer-motion

Replace `CollapsibleContent` with framer-motion's `AnimatePresence` + `motion.div` for smooth height transitions on drill-down rows.

- Wrap expanded content in `<AnimatePresence>` and conditionally render a `motion.tr` / `motion.div` with `initial={{ height: 0, opacity: 0 }}`, `animate={{ height: 'auto', opacity: 1 }}`, `exit={{ height: 0, opacity: 0 }}` using 200ms ease-out (per motion standards).
- Remove `Collapsible`/`CollapsibleContent` usage from rows; keep `expandedIds` state for open/close logic.
- Wrap each row pair in a fragment keyed by service ID.

### 2. Inline Config Summary on Main Row

For tracked services, show a compact summary like "3 of 4 on" or "2 toggles · Components ✓" next to the service name to reduce need to expand.

- Count active toggles: `assistant_prep_allowed`, `smart_mix_assist_enabled`, `formula_memory_enabled` (3 booleans). Show e.g. "2/3 on".
- Include component/allowance status as compact icons (already present — keep those, add the toggle count as a subtle text label).
- Place this summary on the second line alongside category, e.g. `"Color · 2/3 toggles on"`.

### 3. Swipe-to-Expand for Mobile/Tablet

Add touch gesture support using framer-motion's drag gesture (no Capacitor-specific API needed — works in browser and native webview).

- On mobile (`useIsMobile()`), add `onTouchStart`/`onTouchEnd` handlers to each `TableRow` that detect a downward swipe (>40px vertical delta) to expand, and upward swipe to collapse.
- Keep it simple: plain touch event math, no external gesture library needed. This works in both browser and Capacitor webview.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`
  - Replace Collapsible with framer-motion AnimatePresence for expand rows
  - Add toggle count summary text in Service cell for tracked services
  - Add touch swipe handlers for mobile expand/collapse

