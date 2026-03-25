

## Redesign Service Tracking Progress for Clarity

### Problem
The current progress bar is confusing because:
1. The segmented bar mixes amber/white/gray fills making it hard to read at a glance
2. "Classified 66/74" is vague — classified *how*? What does the user need to do?
3. The combined percentage (67%) is a weighted average across unrelated milestones, which is misleading
4. Milestone chips use info tooltips for explanations that should be visible upfront

### Redesign

Replace the single segmented bar + chips with a **vertical step checklist** — three clear rows, each with its own mini progress bar, plain-language label, and status.

```text
┌──────────────────────────────────────────────────────────────┐
│  Setup Progress                              [Quick Setup]  │
│                                                              │
│  ① Classify Services              66 of 74 done             │
│     ████████████████████████░░░░  89%                        │
│     Review each service and mark whether it uses             │
│     color or chemical products.                              │
│                                                              │
│  ② Enable Tracking                48 of 48  ✓               │
│     ████████████████████████████  100%                       │
│     Turn on backroom tracking for color/chemical services.   │
│                                                              │
│  ③ Set Allowances                 0 of 48                    │
│     ░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%                         │
│     Define supply allowances and overage billing rules.      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Key improvements
- **Sequential steps** (①②③) make order obvious — classify first, then track, then set allowances
- **Individual progress bars** per step instead of one confusing segmented bar
- **Plain-language descriptions** replace tooltip-only explanations
- **Green checkmark** on completed steps, amber for in-progress, muted for not started
- Collapse completed steps to a single line to reduce noise as setup progresses

### Technical details

**File: `ServiceTrackingProgressBar.tsx`** — Full rewrite of the component:
- Replace segmented bar + chips with a vertical stepper layout
- Each milestone renders as a row: step number, label, count, individual `Progress` bar, description text
- Completed steps show condensed (single line with checkmark)
- Keep celebration animation logic unchanged

**File: `ServiceTrackingSection.tsx`** — Update milestone tooltips to be full descriptions (used as the subtitle text), no other changes needed.

### Files Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingProgressBar.tsx`
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` (milestone descriptions)

