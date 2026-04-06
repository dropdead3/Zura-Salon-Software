

# Redesign Level Roadmap PDF to Match Digital Preview

## Problem
The current PDF export uses a landscape layout with dense `autoTable` grids — it looks like a spreadsheet dump. The digital preview (LevelRoadmapView) uses a polished portrait layout with a timeline, summary stat cards, and per-level detail cards with compensation, KPI requirements, evaluation details, and retention policies. The PDF should mirror that structure.

## Approach
Rewrite `LevelRequirementsPDF.ts` to produce a portrait A4 document that replicates the digital preview's visual hierarchy using jsPDF drawing primitives (no autoTable grids).

### PDF Layout (Portrait A4)

```text
┌──────────────────────────────┐
│  [Logo]  ORG NAME            │  Dark header bar
│  Level Graduation Roadmap    │
│  Generated: Apr 6, 2026      │
├──────────────────────────────┤
│                              │
│  ○──○──○──○──○──○            │  Timeline: circles with
│  L1  L2  L3  L4  L5  L6     │  level numbers, names,
│                              │  connectors, ✓/△ badges
├──────────────────────────────┤
│  [Total Levels] [Configured] │  Summary stats row
│  [Retention Rules]           │  (3 rounded boxes)
├──────────────────────────────┤
│                              │
│  ┌─ Level 1 — Junior ─────┐ │  Per-level cards:
│  │ Compensation: 30% svc   │ │  - Color accent bar (top)
│  │ KPIs: $5K rev, 60% reb  │ │  - Compensation section
│  │ Eval: 90d window, Auto  │ │  - KPI grid
│  │ Retention: 60d / Coach  │ │  - Eval details
│  └─────────────────────────┘ │  - Retention policy
│                              │
│  ┌─ Level 2 — Senior ─────┐ │
│  │ ...                     │ │
│  └─────────────────────────┘ │
├──────────────────────────────┤
│  Confidential · Org Name     │  Footer on every page
└──────────────────────────────┘
```

### Key Design Decisions
- **Portrait A4** instead of landscape — matches the digital view's vertical flow
- **Timeline drawn with circles** — filled circles with level numbers, chevron connectors, ✓/△ status dots (matching the stone→amber→gold color progression from `level-colors.ts`)
- **Summary stats** — 3 rounded rect boxes with label + value, same as the digital preview
- **Per-level cards** — rounded rectangles with a thin colored accent bar at top, sections for Compensation, KPI Requirements (grid layout), Evaluation Details, and Retention Policy
- **Auto page-breaks** — measure card height before drawing; if it won't fit, add a new page
- **No autoTable** — all content drawn with `doc.text()`, `doc.rect()`, `doc.roundedRect()`, and `doc.line()` for a cleaner, card-based look

### Color Mapping for PDF
Reuse the same hex stops from the digital preview (`#f5f5f4` → `#f59e0b`) for timeline node fills and card accent bars.

## Files

| File | Action |
|------|--------|
| `src/components/dashboard/settings/LevelRequirementsPDF.ts` | **Rewrite** — new portrait card-based layout matching digital preview |

No new files, no database changes. The calling code in `StylistLevelsEditor.tsx` stays the same (same function signature and return type).

