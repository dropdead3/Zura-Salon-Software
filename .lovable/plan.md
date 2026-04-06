

# Improve Criteria Table Readability and Organization

## Problems Identified

1. **Text too small** — `text-xs` (12px) used everywhere for labels, values, and headers. Hard to read at a glance.
2. **Too dense** — minimal padding, tight rows, everything blends together visually.
3. **Section headers are subtle** — thin tinted backgrounds don't create enough visual separation between Compensation, Promotion, and Retention sections.
4. **Column headers cramped** — level names at `text-xs` with tiny Edit buttons and shield icons packed into narrow columns.
5. **Read-only values lack weight** — displayed values like `$5000`, `80%` are the same size as labels, making scanning difficult.
6. **Editing controls are tiny** — Auto-step, Save, X buttons at `text-[10px]` are hard to click and read.

## Solution

### Typography bump across the board

| Element | Current | New |
|---------|---------|-----|
| Column headers (level names) | `text-xs` | `text-sm font-medium` |
| Metric labels (left column) | `text-xs` | `text-sm` |
| Cell values (read-only) | `text-xs` | `text-sm` |
| Section headers | `text-xs` | `text-sm` |
| Edit/Configure links | `text-[10px]` | `text-xs` |
| Editing action buttons | `text-[10px]` | `text-xs` |

### Spacing improvements

- Left "Metric" column: widen from `w-[160px]` to `w-[180px]`
- Level columns: increase `min-w` from `100px` to `120px`
- Row padding: ensure consistent `py-2.5` on data rows
- Section header rows: increase to `py-3` with slightly stronger background

### Visual hierarchy

- Section headers: use `bg-muted/50` (stronger) with a left accent border `border-l-2 border-l-primary`
- Read-only values: use `text-foreground` with `tabular-nums` for aligned numbers
- Empty dashes: keep at subdued `text-muted-foreground/40` but bump to `text-sm`
- Checkbox in edit mode: increase from `w-3.5 h-3.5` to `w-4 h-4`

### Editing row improvements

- Action buttons (Auto-step, Save, Cancel): bump to `text-xs px-2 py-1` for easier clicking
- Input width stays at `w-[90px]` (already improved), height stays `h-8`

## Files Modified

- `src/components/dashboard/settings/StylistLevelsEditor.tsx` — typography, spacing, and visual hierarchy updates within `CriteriaComparisonTable`

## No database changes.

