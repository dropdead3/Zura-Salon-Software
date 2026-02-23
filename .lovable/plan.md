

## Enhance Select All Checkbox UI

### Problem
The current "Select All" checkbox in the table header is a bare, unlabeled checkbox that blends into the column headers. Users may not recognize it as a batch-selection control.

### Solution
Replace the bare checkbox with a more descriptive, visually distinct control that communicates its purpose clearly:

1. **Add a text label** next to the checkbox: "All" (or the count when some are selected, e.g. "3 of 42")
2. **Style the cell** so the checkbox + label group stands out slightly from the column headers
3. **Show selection count** when items are partially selected to reinforce the selection state

### Visual Behavior

| State | Display |
|-------|---------|
| None selected | `[ ] All` |
| Some selected (e.g. 3 of 42) | `[-] 3 selected` (indeterminate) |
| All selected | `[x] All` |

The label text will use `text-xs text-muted-foreground` styling, keeping it subtle but readable. The checkbox and label will be wrapped in a clickable `label` element so the entire area is tappable.

### Technical Details

**File:** `src/components/dashboard/appointments-hub/AppointmentsList.tsx`

1. In the `TableHeader`, expand the first `TableHead` cell (currently `w-10 pr-0`) to be wider (`w-[100px]`) to accommodate the label
2. Wrap the `Checkbox` in a `label` element with `flex items-center gap-1.5 cursor-pointer`
3. Add a `span` after the checkbox:
   - When none selected: `"All"`
   - When some selected: `"{n} selected"`
   - When all selected: `"All"`
4. Style the span with `text-xs text-muted-foreground whitespace-nowrap`

Single file edit. No new dependencies.

