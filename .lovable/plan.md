

## Redesign Goal Wizard: Template-First "Done for You" Experience

You're absolutely right to push on this. The current dialog is a configuration form -- it asks the owner to navigate dropdowns, understand thresholds, and fill 7 fields. That's not fun or intuitive. The best approach is to flip the model: show the owner a visual menu of pre-built goals, let them tap to select, and auto-fill everything. Two taps and they're done.

### Current Problem

The dialog has sequential dropdowns (Category → Template → fields), exposes "Warning Threshold" and "Critical Threshold" upfront, and treats every goal as a one-at-a-time affair. A salon owner opening this for the first time has to make 7+ decisions to add a single goal. That's friction, not fun.

### Solution: Two-Step Visual Wizard

**Step 1 -- Pick Your Goals** (the fun part)

A visual grid of selectable template cards grouped by category. Each card shows the goal name, a short description, and the suggested target as a preview. Tap to select, tap again to deselect. Already-existing goals show as disabled with a checkmark. A counter at the bottom shows "X selected" with a "Next" button.

**Step 2 -- Customize Targets** (the quick part)

A compact list of selected goals with pre-filled industry benchmarks. Each row shows the goal name, description, and an editable target input. Warning/critical thresholds are auto-filled but hidden behind a collapsible "Advanced" toggle -- most owners will never touch them.

The owner can add 3-5 goals in under 30 seconds by tapping cards and hitting Save.

**Edit mode**: When editing an existing goal, skip Step 1 and go straight to the single-goal edit form (current Step 2 layout with one item).

### Visual Layout

```text
Step 1: Choose Your Goals
─────────────────────────────────────────────────

REVENUE
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ ✓ Monthly Revenue │ │   Average Ticket  │ │   Retail Revenue  │
│   $50,000/mo      │ │   $160/appt       │ │   $8,000/mo       │
│   Total monthly   │ │   Revenue per     │ │   Product sales   │
│   revenue target  │ │   appointment     │ │   target          │
└───────────────────┘ └───────────────────┘ └───────────────────┘

PROFITABILITY
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│   Labor Cost %    │ │   Net Margin      │ │   Product Cost %  │
│   ≤ 45%           │ │   ≥ 20%           │ │   ≤ 10%           │
└───────────────────┘ └───────────────────┘ └───────────────────┘

CLIENT HEALTH  ·  EFFICIENCY  ·  TEAM  (continues below)

                    3 selected          [ Next → ]

─────────────────────────────────────────────────

Step 2: Set Your Targets
─────────────────────────────────────────────────
┌─────────────────────────────────────────────────┐
│ Monthly Revenue                    [$50,000   ] │
│ Total monthly revenue target              $/mo  │
├─────────────────────────────────────────────────┤
│ Average Ticket                     [$160      ] │
│ Revenue per appointment                   $/mo  │
├─────────────────────────────────────────────────┤
│ Client Retention                   [80%       ] │
│ Clients returning within window           %/mo  │
└─────────────────────────────────────────────────┘

  [▸ Advanced: Warning & Critical Thresholds]

              [← Back]        [Save 3 Goals]
```

### Technical Details

**File: `src/components/dashboard/goals/GoalSetupDialog.tsx`** -- Full rewrite

- Internal `step` state: `'select' | 'customize'`
- When `editGoal` is provided, skip to step `'customize'` with just that goal
- Step 1 renders `GOAL_TEMPLATES` grouped by category using `Object.entries(groupBy(GOAL_TEMPLATES, 'category'))`
- Each template card is a `button` with `border-2 rounded-xl` that toggles between `border-transparent` and `border-primary bg-primary/5`
- Already-existing goals (in `existingMetricKeys`) render with a check badge and `pointer-events-none opacity-60`
- Category headers use `tokens.heading.subsection`
- Selected count + "Next" button in sticky footer
- Step 2 renders selected templates as a list with inline editable `Input` for target value
- Collapsible "Advanced" section per goal for warning/critical thresholds (using Collapsible component)
- "Save All" button triggers batch mutation
- Dialog uses `sm:max-w-2xl` to accommodate the grid (wider than current `sm:max-w-md`)
- Scroll area inside dialog content for many templates

**File: `src/hooks/useOrganizationGoals.ts`** -- Add batch upsert mutation

- New `useBatchUpsertOrganizationGoals()` hook
- Accepts array of goal objects, upserts all in a single Supabase call
- Uses the same `onConflict` key as the single upsert
- Single success toast: "X goals saved"
- Keeps existing single `useUpsertOrganizationGoal` for the edit flow

### Files Modified

| File | Change |
|------|--------|
| `GoalSetupDialog.tsx` | Full rewrite: two-step wizard with visual template grid + target customization |
| `useOrganizationGoals.ts` | Add `useBatchUpsertOrganizationGoals` batch mutation |

No database changes. No new files.

