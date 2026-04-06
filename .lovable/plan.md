

# Show "N/A" for Unconfigured Retention Cells

## Problem
The retention section rows (Eval Window, Grace Period, Action) display a clickable "Configure" button for levels without retention criteria. This is misleading — retention KPI minimums are inherited from the promotion thresholds above, and dropping below them results in demotion all the way to Level 1. There's nothing to independently "configure" for most levels.

## Change

### File: `src/components/dashboard/settings/StylistLevelsEditor.tsx`

**Update the cell rendering logic (~line 757)** for retention-section metrics. When `metric.section === 'retention'` and no retention record exists, render `—` (or "N/A") instead of the "Configure" button. The "Configure" button should only appear for promotion-section cells that lack criteria.

Specifically, change the conditional at line 757 so that retention cells without data always fall through to the `—` dash display, matching the base-level pattern. This is a single conditional tweak — roughly:

```
) : (metric.section === 'promotion' && !promo) ? (
  <button ...>Configure</button>
) : (
  <span>—</span>
)
```

This removes the "Configure" affordance from all retention rows, since retention policy is inherited from promotion requirements.

**Also update the retention section header subtitle** to clarify the demotion model: "KPI minimums inherited from Level Requirements · Falling below triggers demotion to Level 1"

### No database changes. Single file edit.

