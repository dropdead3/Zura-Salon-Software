

# Responsiveness Hardening for High Level Counts

## Problem Areas

With 20+ levels, the roadmap document becomes unwieldy in three ways beyond the timeline:

1. **Detail cards scroll forever** — 20 full-height cards stacking vertically creates an extremely long document. No way to quickly navigate or collapse sections.
2. **Summary stats grid breaks on mobile** — `grid-cols-3` crunches below ~400px viewport width.
3. **Print pagination** — 20 detail cards span many pages with no explicit page-break control, risking cards splitting mid-content across pages.
4. **PDF generation** — Same issue as print; the downloaded PDF could be unwieldy without pagination hints.

## Proposed Changes

### 1. Collapsible Detail Cards (Accordion)
- When `levels.length > 6`, render detail cards inside an accordion pattern (click header to expand/collapse)
- First card and any "Incomplete" cards default to expanded; rest collapsed
- Each card header shows: level number, name, configured badge, and commission summary — enough context without expanding
- Print media query: force all cards expanded (`print:block`)

### 2. Mobile-Safe Summary Stats
- Change `grid-cols-3` to `grid-cols-1 sm:grid-cols-3` so stats stack on narrow viewports

### 3. Print Page-Break Control
- Add `break-inside-avoid` (already present) plus `page-break-after: auto` on each card
- Add `page-break-before: always` on every 4th card to prevent extremely long unbroken runs
- Force timeline to `flex-wrap justify-center` on print (already done)

### 4. "Jump to Level" Quick Nav (Optional Enhancement)
- For 10+ levels, add a small sticky pill bar below the timeline with level number buttons that scroll to the corresponding detail card
- Hidden on print

## Files

| File | Action |
|------|--------|
| `src/components/dashboard/settings/LevelRoadmapView.tsx` | **Edit** — add accordion, responsive grid, print breaks, optional quick nav |

No new files, no database changes.

