

# Inline Row-Based KPI Configurator

## Concept

Transform the existing read-only comparison table into an **inline-editable matrix**. Instead of clicking "Edit" → opening a wizard per level, you click a metric row (e.g., Revenue) and input fields appear for **all levels in that row** simultaneously. This lets you set escalating thresholds in one pass — you can see and adjust the progression across levels side-by-side.

The per-level wizard (GraduationWizard) remains available for advanced settings (weights, eval window, approval mode), but the most common task — setting KPI thresholds — becomes a quick inline operation.

```text
┌──────────────┬──────────┬──────────┬──────────┬──────────┐
│ Revenue      │   —      │ $15,000  │ $20,000  │ $28,000  │  ← click row
├──────────────┼──────────┼──────────┼──────────┼──────────┤
│ Revenue      │   —      │ [15000 ] │ [20000 ] │ [28000 ] │  ← inline inputs
│              │ base     │          │          │  [Save]  │
└──────────────┴──────────┴──────────┴──────────┴──────────┘
```

## UX Details

- **Click a metric row** → cells flip to compact number inputs for all non-base levels
- **Base level** (first) stays as "—" for promotion metrics (unchanged behavior)
- **Enable toggle**: A small checkbox appears in each cell — unchecked means "not tracked" for that level, checked enables the input
- **Save row**: A single "Save" button at the end of the row saves all levels for that metric at once
- **Cancel**: Clicking away or pressing Escape reverts to read-only
- **Auto-step helper**: Optional "Even step" button that auto-distributes values linearly between the first and last level's thresholds (e.g., set Level 2 = $15K and Level 6 = $30K → auto-fills $18K, $21K, $24K, $27K)
- **Inconsistency warnings** remain live as you type — if a higher level has a lower value, the amber triangle appears immediately

## Technical Plan

### A. Refactor `CriteriaComparisonTable` (same file)

Add local state:
- `editingMetric: { label: string; section: 'promotion' | 'retention' } | null`
- `editValues: Record<levelDbId, { enabled: boolean; value: string }>`

When a row is clicked or "Configure" is clicked:
1. Set `editingMetric` to that row
2. Populate `editValues` from existing criteria data (or empty for unconfigured levels)
3. Render `<Input type="number" />` in each cell instead of the display value

### B. Save logic

On "Save row":
1. For each level that has `enabled: true` and a valid numeric value, call the existing `useUpsertLevelPromotionCriteria` or `useUpsertLevelRetentionCriteria` mutation
2. Map the metric label back to the correct field (e.g., "Revenue" → `revenue_enabled` + `revenue_threshold`)
3. Merge with existing criteria for that level (preserve weights, eval window, other metrics)
4. Batch upserts sequentially per level (the upsert hook handles one level at a time)

### C. "Even Step" helper

A small button labeled "Auto-step" appears when 2+ levels have values. It takes the first and last non-base values and linearly interpolates the middle levels. Pure client-side math, updates `editValues` state only.

### D. Files modified

- `src/components/dashboard/settings/StylistLevelsEditor.tsx` — refactor `CriteriaComparisonTable` to support inline editing mode with row-level state, save, and auto-step

### E. No database changes

Uses existing upsert hooks and table structure.

## Enhancement Suggestions

1. **Percentage vs. currency formatting** — Show `$` prefix for revenue/avg ticket inputs and `%` suffix for rate inputs, matching the display format
2. **Keyboard navigation** — Tab between level inputs in a row for fast data entry
3. **Bulk enable/disable** — A row-level toggle to enable/disable a metric across all levels at once

