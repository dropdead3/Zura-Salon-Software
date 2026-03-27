

## Redesign Progress Tracker: Completed vs. Remaining

### Problem
The current vertical step checklist is flat and hard to scan — all 3 milestones look the same regardless of completion state. With 48/48 tracked but 0/48 on billing and allowances, there's no visual separation between what's done and what still needs attention.

### New Design

Replace the flat list with two visual groups: **Completed** and **Remaining**, with a single overall progress indicator at the top.

**Layout:**

```text
┌─────────────────────────────────────────────────┐
│  Setup Progress          2 of 3 complete   [===▓░] 67%  │
│                                                         │
│  ✓ COMPLETED                                            │
│  ┌─────────────────────────────────────────────┐        │
│  │ ✓ Track Services              48 of 48      │        │
│  └─────────────────────────────────────────────┘        │
│                                                         │
│  ○ REMAINING                                            │
│  ┌─────────────────────────────────────────────┐        │
│  │ 2  Set Billing Method         0 of 48       │        │
│  │    ━━━━━━━━━━━━━━━━━━━━━━━━ (empty bar)     │        │
│  │    Choose how each service is billed...      │        │
│  ├─────────────────────────────────────────────┤        │
│  │ 3  Configure Allowances       0 of 48       │        │
│  │    ━━━━━━━━━━━━━━━━━━━━━━━━ (empty bar)     │        │
│  │    Build recipes for allowance services...   │        │
│  └─────────────────────────────────────────────┘        │
│                                            [Quick Setup]│
└─────────────────────────────────────────────────┘
```

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingProgressBar.tsx`**

Full rewrite of the render logic:

1. **Overall progress header** — "Setup Progress" title with "X of Y complete" and a single summary `Progress` bar spanning all milestones
2. **Completed section** — Group header "COMPLETED" (font-display, muted, small) followed by completed milestones as compact rows: green checkmark + label + count. No progress bar or description (already done)
3. **Remaining section** — Group header "REMAINING" followed by incomplete milestones with step number, label, count, progress bar, and description tooltip (current incomplete rendering preserved)
4. Either group header is hidden if that group is empty (all complete or none complete)
5. Celebration overlay stays as-is

### Technical Details

- Split `milestones` into `completed` and `remaining` arrays via `.filter()`
- Completed items render as a compact `bg-primary/5 rounded-lg` card with green check styling
- Remaining items keep the current amber/muted progress bar treatment
- Overall progress: `completedCount / milestones.length` (milestone-level, not service-level)
- No changes to `ServiceTrackingSection.tsx` — the component contract (`milestones: ProgressMilestone[]`) stays identical

