

# Move Inline Row Save to Fixed Bottom-Right Toast Bar

## Problem
The "Save" and "Auto-step" buttons currently appear inline within the metric label cell when editing a row. This is cramped, especially on narrower viewports, and the screenshot shows it pushing into the label text. Moving the save controls to a fixed bottom-right position (like a toast bar near the FAB area) gives more room and is consistent with the `hasChanges` save pattern.

## Approach

### File: `src/components/dashboard/settings/StylistLevelsEditor.tsx`

**1. Remove inline Save/Auto-step/Cancel from the metric label cell**
Strip the button cluster (lines ~798–830) from inside the `TableCell`. Keep only the metric label and tooltip. The row still highlights with `isEditingRow` styling so users know which row is active.

**2. Add a fixed-position action bar when `editingMetric` is active**
Render a floating bar at `fixed bottom-6 right-6 z-50` (same position pattern as `DockLockFAB`). It should stack vertically or sit as a horizontal pill containing:
- Metric name label (e.g. "Revenue")
- "Auto-step" button (conditionally, same logic)
- "Save" button
- "✕" cancel button

Style: glass card aesthetic (`bg-card/90 backdrop-blur-xl border border-border rounded-xl shadow-lg p-3`) to match the platform's luxury feel. Use `animate-in` for entry.

**3. Vertical alignment with existing FABs**
Position using `bottom-6 right-6` and if there are other FABs on the page, stack above them with `bottom-20` or use a flex column container.

### No other files changed. No database changes.

