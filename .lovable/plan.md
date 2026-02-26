

## Move Today's Prep Card to Top of Command Center

### What Changes

Move `todays_prep` from its current position (after `quick_stats`) to directly after `ai_insights` in the default section order, so it's the first content card stylists see after the intelligence brief.

### Changes Required

**1. `src/hooks/useDashboardLayout.ts`**
- Update `DEFAULT_LAYOUT.sections` and `DEFAULT_LAYOUT.sectionOrder` arrays to place `todays_prep` immediately after `ai_insights`
- Current order: `ai_insights, hub_quicklinks, payroll_deadline, ..., quick_stats, todays_prep, ...`
- New order: `ai_insights, todays_prep, hub_quicklinks, payroll_deadline, ..., quick_stats, ...`
- Update the migration block that inserts `todays_prep` for existing layouts — change the fallback insertion point from "after quick_stats" to "after ai_insights"

### Result

```text
┌─────────────────────────────────┐
│ Zura Insights                   │
├─────────────────────────────────┤
│ Today's Prep (moved here)       │
│  9:00  [Booked]  Jane D. ...    │
│ 10:30  [Confirmed] Mark T. ...  │
├─────────────────────────────────┤
│ Hub Quick Links                 │
│ Quick Stats                     │
│ Tasks                           │
│ ...                             │
└─────────────────────────────────┘
```

### Files Changed

| File | Action |
|------|--------|
| `src/hooks/useDashboardLayout.ts` | Reorder `todays_prep` to position after `ai_insights` in both arrays + update migration fallback |

