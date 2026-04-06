

# Rename "Required to Graduate" → "Level Requirements" + UI Polish

## Terminology Changes

The promotion tab in the Level Criteria wizard should read **"Level Requirements"** (not "Required to Graduate") since this represents what a stylist must achieve to earn/reach that level. The concept is requirements-based, not graduation-based.

### Files requiring terminology updates:

| File | Current | New |
|------|---------|-----|
| `GraduationWizard.tsx` (line 558) | "Required to Graduate" tab label | "Level Requirements" |
| `GraduationWizard.tsx` (line 673) | "Toggle on the metrics that matter for promotion to this level." | "Toggle on the metrics that matter to earn this level." |
| `GraduationWizard.tsx` (line 859) | "To become {levelLabel}, a stylist must maintain:" | "To earn {levelLabel}, a stylist must maintain:" |
| `useLevelPromotionCriteria.ts` (line 103) | toast: "Graduation criteria saved" | "Level criteria saved" |
| `useLevelPromotionCriteria.ts` (line 126) | toast: "Graduation criteria removed" | "Level criteria removed" |
| `LevelRequirementsPDF.ts` (line 279) | "Required to Graduate — Promotion Criteria" | "Level Requirements — Promotion Criteria" |

## UI Improvements (GraduationWizard.tsx)

### A. Tab toggle redesign (lines 554-564)
Replace the default `TabsList`/`TabsTrigger` with a custom segmented control using proper pill styling that matches the platform's design language. Use `ToggleGroup` with `rounded-full` items for a cleaner, more intentional selector:

```text
┌──────────────────────────────────────────┐
│  ★ Level Requirements  │  ◐ Required to Stay  │
└──────────────────────────────────────────┘
```

- Use `ToggleGroup` single-select with `data-[state=on]:bg-foreground data-[state=on]:text-background` active styling (matching the earnings structure selector pattern)
- Wrap in a `bg-muted rounded-full p-1` container for a proper segmented look

### B. Step indicators redesign (lines 568-602)
Replace the numbered bubbles + dashes with a cleaner horizontal stepper:

- Remove the circled numbers (`1`, `2`, `3`) — replace with small dots or filled/unfilled indicators
- Use a thin continuous progress line connecting steps
- Active step: text in `text-foreground` with a small filled dot
- Completed step: checkmark icon (keep existing `Check`)
- Future step: hollow dot with `text-muted-foreground`
- Remove the clickable pill buttons — use simpler inline text with dot indicators

```text
  ● Requirements ——— ○ Weights ——— ○ Settings
```

### C. No database changes

## Summary
- **2 files modified** (`GraduationWizard.tsx`, `useLevelPromotionCriteria.ts`)
- **1 file updated** (`LevelRequirementsPDF.ts`) — PDF header text
- Terminology alignment across all surfaces
- Polished tab toggle and step indicator UI

