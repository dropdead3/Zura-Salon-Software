

# Criteria Configuration Table View

## Problem

Currently, promotion and retention criteria are configured one level at a time via a dialog (GraduationWizard). The admin has no way to see all levels' criteria side-by-side, making it impossible to verify that thresholds increase progressively or spot gaps without clicking into each level individually.

## Solution

Add a new **"Criteria" tab** to the Stylist Levels Editor (alongside Levels, Team Roster, Previews) that renders a full comparison table showing all levels and their promotion + retention metrics in one view.

### Table Layout

```text
                  | New Talent | Studio Stylist | Senior Stylist | Master Stylist
──────────────────|------------|----------------|----------------|---------------
PROMOTION
  Revenue         |    —       |   $6K/mo       |   $8K/mo       |   $12K/mo
  Retail %        |    —       |   10%          |   15%          |   18%
  Rebooking %     |    —       |   60%          |   65%          |   70%
  Avg Ticket      |    —       |    —           |   $110         |   $140
  Tenure          |    —       |    —           |    —           |   365 days
  Eval Window     |    —       |   30d          |   60d          |   60d
  Approval        |    —       |   Auto         |   Auto         |   Manual
──────────────────|------------|----------------|----------------|---------------
RETENTION
  Revenue         |    —       |   $4K/mo       |   $5.5K/mo     |   $8K/mo
  Retail %        |    —       |   5%           |   8%           |   12%
  Rebooking %     |    —       |   45%          |   50%          |   55%
  Avg Ticket      |    —       |    —           |   $85          |   $100
  Grace Period    |    —       |   30d          |   30d          |   30d
  Action          |    —       |   Coaching     |   Coaching     |   Demotion
```

### Key Features

- **Level 1 column** shows "Entry Level" with dashes — no criteria needed
- **Unconfigured levels** show a "Configure" button in that column cell
- **Configured levels** show values with an "Edit" button at the column header that opens the existing GraduationWizard
- **Progressive validation hints**: If a higher level has a lower threshold than the level before it, show a subtle warning icon (inconsistency detection)
- **Responsive**: On narrow screens, the table scrolls horizontally inside `overflow-auto`

### Interaction

- Clicking "Edit" on any level column opens the existing GraduationWizard for that level — no new forms needed
- The table is read-only display with edit entry points; all editing still happens in the wizard dialog

## File Changes

| File | Action |
|------|--------|
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | **Modify** — Add "Criteria" tab between "Levels" and "Team Roster" tabs; render the comparison table using existing `promotionCriteria` and `retentionCriteria` data already fetched |

**0 new files, 1 modified file, 0 migrations.**

## Technical Details

- Use `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` from `@/components/ui/table`
- Data source: `promotionCriteria` and `retentionCriteria` arrays already fetched in the component (lines 53-54)
- Match criteria to levels via `stylist_level_id === level.dbId`
- Row grouping: two sections ("Promotion" and "Retention") separated by a subtle section header row using `TableRow` with `bg-muted/30`
- Progressive validation: compare each metric value to the previous level's value; if current < previous, add `AlertTriangle` icon (already imported)
- Tab value: `"criteria"`, placed as second tab

