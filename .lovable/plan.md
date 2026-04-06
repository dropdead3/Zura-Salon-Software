

# Unify Level Roadmap: Digital Preview, Print, and PDF

## Current State
- **Digital preview** (LevelRoadmapView.tsx): The source of truth — clean card-based layout with timeline, stats, and level detail cards.
- **Print preview**: Opens a new window and clones the digital DOM. Already close but has issues: accordion sections may not fully expand, some print-specific styles are missing (page breaks, margins), and the action bar/jump-nav may leak through.
- **PDF download**: Manually drawn with jsPDF. While recently rewritten, it diverges in spacing, section ordering, typography weight, and visual hierarchy from the digital view.

## Goal
All three outputs should feel like the same document at different fidelities.

## Changes

### 1. Print Preview — Polish the clone (`LevelRoadmapView.tsx`)
- Force-expand ALL accordion card content in the clone (current code removes `.hidden` but the accordion uses conditional rendering — need to ensure all card bodies are present)
- Strip `print:hidden` elements (jump nav, expand/collapse controls) from the clone
- Add print-specific CSS: proper page margins, `break-inside: avoid` on cards, force white background, hide scrollbars
- Add a clean page header (org name + "Level Graduation Roadmap") and footer (confidential + page number) using `@page` margin and fixed-position header/footer elements
- Ensure the timeline wraps cleanly on print by forcing `flex-wrap` and removing overflow scroll

### 2. PDF Download — Align with digital view (`LevelRequirementsPDF.ts`)
- **Card structure**: Match the digital's section order exactly: accent bar → title + badge → (base subtitle) → (incomplete warning) → Compensation → KPIs grid → Evaluation details → Retention policy
- **Incomplete warning**: Add the amber "not configured" callout box for incomplete levels (currently missing from PDF)
- **Compensation layout**: Match digital's side-by-side `LABEL value` pattern with proper gap instead of inline dot-separated
- **KPI grid**: Use consistent 2-col on narrow / 4-col grid with the same label-above-value pattern; match the `bg-neutral-50 border-neutral-100` aesthetic with slightly more padding
- **Section header spacing**: Increase gap between sections to match digital's `mb-4` rhythm
- **Timeline**: Fine-tune node sizes and label positioning to better match the digital's `w-14 h-14` proportional feel
- **Footer**: Match digital's exact copy: "Confidential — For internal use only · {orgName}"
- **Card height estimation**: Fix calculation to account for the incomplete warning box and adjusted spacing so page breaks work correctly

### 3. Shared visual alignment details
- Same color stops (already shared via `BG_HEX_STOPS` / `getLevelColor`)
- Same section header labels: "COMPENSATION", "RETENTION MINIMUMS" / "GRADUATION REQUIREMENTS", "RETENTION POLICY"
- Same evaluation detail format: icon-dot + text, dot-separated
- Same status badge text: "Configured" / "Setup Incomplete" (PDF currently says "Incomplete" — align to digital's "Setup Incomplete")

## Files

| File | Action |
|------|--------|
| `src/components/dashboard/settings/LevelRoadmapView.tsx` | Improve `handlePrint` — better clone handling, print CSS for headers/footers/page breaks |
| `src/components/dashboard/settings/LevelRequirementsPDF.ts` | Align card structure, spacing, section order, and copy to match digital preview |

No new files, no database changes.

