

## Flip Layout: Picker Above, Bowl Lines Below

### Change

In `AllowanceCalculatorDialog.tsx`, inside the `!bowl.collapsed` block (line ~776), swap the order so the picker panel renders **before** the product lines.

**Current order (line ~776–970):**
1. Empty state
2. Color product lines
3. Developer lines
4. `renderPickerPanel(bowlIdx)` ← picker at bottom
5. Vessel subtotal

**New order:**
1. `renderPickerPanel(bowlIdx)` ← picker moves to top
2. Empty state (only when no lines)
3. Color product lines
4. Developer lines
5. Vessel subtotal

This way the user selects products at the top, and watches the bowl build below — a more natural top-down flow.

| File | Change |
|------|--------|
| `AllowanceCalculatorDialog.tsx` | Move `renderPickerPanel(bowlIdx)` call from line 970 to before the empty state block (line ~778) |

