

## Enhance Goals Tab UI: From Confusing to Clear

The current layout has five category sections each showing a full-width empty state with redundant "Add Goal" + "Set Your First Goal" buttons, taking up enormous vertical space and creating a wall of repetitive empty states. This violates the "high signal, low noise" doctrine.

### Problems Identified

1. **Redundant CTAs**: Each empty section has both an "Add Goal" pill in the header AND a "Set Your First Goal" button in the empty state body -- two ways to do the same thing per section
2. **Massive empty vertical space**: Each section has `py-8` empty state padding, so five empty sections create a scroll-heavy page of nothing
3. **No visual containment**: Sections float without card boundaries, making the page feel unstructured
4. **No onboarding guidance**: When all sections are empty, there's no guidance on where to start or why these categories matter

### Solution: Collapsed Empty State + Guided Onboarding

**When no goals exist at all** (fresh state): Show a single onboarding card explaining the goal system with a prominent CTA to add the first goal. The category overview tiles already serve as navigation.

**When some goals exist but a category is empty**: Collapse the empty state to a single subtle line with the "Add Goal" button (no redundant "Set Your First Goal").

**When goals exist in a category**: Show the goal cards grid as currently designed.

### Changes

**File: `src/components/dashboard/goals/GoalsTabContent.tsx`**
- Add a check: if `goals.length === 0`, render a single onboarding empty state card instead of five empty sections
- When goals exist, only render category sections that have goals OR show all categories in a more compact format

**File: `src/components/dashboard/goals/GoalCategorySection.tsx`**
- Remove the redundant "Set Your First Goal" button from the empty state body
- When empty, collapse to a compact single-row layout: category name + description on left, "Add Goal" pill on right, with a subtle dashed border container instead of the tall centered empty state
- Reduce empty state height from `py-8` to a compact `py-4` with a dashed border card

**File: `src/components/dashboard/goals/GoalsOverviewHeader.tsx`**
- No structural changes needed -- the tiles are already clean

### Visual Result

**Empty state (no goals at all):**
```text
┌─────────────────────────────────────────────────┐
│  [Revenue] [Profit] [Client] [Efficiency] [Team]│  ← overview tiles (existing)
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  🎯  Set Your Organization Goals                │
│                                                  │
│  Define targets across revenue, profitability,   │
│  client health, efficiency, and team metrics     │
│  to track what matters most.                     │
│                                                  │
│          [ + Add Your First Goal ]               │
└─────────────────────────────────────────────────┘
```

**Partial state (some categories have goals, others don't):**
```text
REVENUE
┌──────────────┐ ┌──────────────┐
│ Monthly Rev  │ │ Avg Ticket   │  ← goal cards
│ $38k / $50k  │ │ $142 / $160  │
└──────────────┘ └──────────────┘

PROFITABILITY
┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ + Add Goal ╌┐  ← compact dashed-border row
│  No profitability goals defined yet.            │
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘

CLIENT HEALTH
┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ + Add Goal ╌┐
│  No client health goals defined yet.            │
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
```

### Files Modified

| File | Change |
|------|--------|
| `GoalsTabContent.tsx` | Add onboarding empty state when `goals.length === 0` |
| `GoalCategorySection.tsx` | Replace tall centered empty state with compact dashed-border row; remove redundant "Set Your First Goal" button |

No database changes. No new files.

