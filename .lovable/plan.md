

## Remove Today's Schedule Card — Merge Into Today's Prep

### The Problem

The "Today's Schedule" card inside the `schedule_tasks` section is a **static placeholder** that always renders "No appointments today / Enjoy your day off" — it fetches zero data. Meanwhile, the Today's Prep card already shows the full appointment list with status badges, service names, client context, VIP/birthday indicators, and action prompts.

These two cards serve the same conceptual purpose: "What's on my plate today?" Having both is redundant and confusing. The prep card is strictly superior.

### What Changes

**Remove the Today's Schedule card from the `schedule_tasks` section**, so that section only contains the Tasks card. Since the schedule half of the 2-column grid disappears, the Tasks card will span full width (no more `lg:grid-cols-2` when only tasks remain).

### Changes Required

**1. `src/pages/dashboard/DashboardHome.tsx`**
- Remove the `todays_schedule` `VisibilityGate` block and its inner Card (lines ~569-585)
- Remove the `lg:grid-cols-2` conditional on the grid wrapper — Tasks card stands alone, full width
- Clean up any unused imports (`Clock` if only used there)

**2. `src/components/dashboard/DashboardCustomizeMenu.tsx`**
- The `schedule_tasks` section entry stays (it still wraps Tasks)
- Remove or update the description/label if it references "Schedule" — rename to just "Tasks" since the schedule half is gone
- Remove the `todays_schedule` visibility entry if it exists as a standalone toggle

**3. `src/hooks/useDashboardLayout.ts`**
- No structural changes needed — `schedule_tasks` stays in the default layout since it still contains the Tasks card

**4. Locale cleanup** — `src/locales/en.json`
- The `todays_schedule` key can remain (harmless), or be removed for cleanliness

### Result

```text
┌─────────────────────────────────┐
│ Quick Stats (4 tiles)           │
├─────────────────────────────────┤
│ Today's Prep (full-width)       │
│  9:00  [Booked]  Jane D. ...    │
│ 10:30  [Confirmed] Mark T. ...  │
│        View Full Prep →         │
├─────────────────────────────────┤
│ My Tasks (full-width)           │  ← was 2-col with schedule, now standalone
│  □ Follow up with Sarah         │
│  □ Restock retail products      │
└─────────────────────────────────┘
```

No data loss. No hook changes. The prep card already provides everything the schedule card was supposed to (and more).

### Files Changed

| File | Action |
|------|--------|
| `src/pages/dashboard/DashboardHome.tsx` | Remove Today's Schedule card block, simplify grid |
| `src/components/dashboard/DashboardCustomizeMenu.tsx` | Update section label from "Schedule & Tasks" to "Tasks" |

