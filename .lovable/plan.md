

## Add Smooth Animation to Service Line Item Drill-Down

### Current State
The expand/collapse already uses `AnimatePresence` + `motion.tr` (lines 633–641), but the animation is basic — just height 0→auto and opacity 0→1 with a fast 200ms duration. The inner content fades independently at 150ms. This feels abrupt.

### Changes — `ServiceTrackingSection.tsx`

**Improve the `motion.tr` transition** (lines 635–640):
- Increase duration to 300ms with a cubic-bezier ease `[0.4, 0, 0.2, 1]` for a smoother Apple-grade feel
- Add a slight y-translate on the inner `motion.div` (lines 643–648) so content slides up into place as it fades in
- Stagger the inner content opacity to start after the height begins opening (add `delay: 0.08`)

**Updated animation values:**
```tsx
// motion.tr (container)
initial={{ height: 0, opacity: 0 }}
animate={{ height: 'auto', opacity: 1 }}
exit={{ height: 0, opacity: 0 }}
transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}

// motion.div (inner content)
initial={{ opacity: 0, y: -8 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -8 }}
transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1], delay: 0.08 }}
```

This gives a polished feel: the row height expands smoothly while the content gently slides and fades in with a slight stagger.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` (lines 635–648 only)

