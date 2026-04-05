

# Graduation Tracker — Full Admin Rebuild

## Problem

The current Graduation Tracker page is built around an **assistant-to-stylist submission checklist** system (graduation_requirements / graduation_submissions tables). It only shows `stylist_assistant` role users and their manual proof submissions. 

Meanwhile, we've built a complete **level promotion criteria** system (level_promotion_criteria table, `useLevelProgress` hook, `LevelProgressCard` component) that computes real-time graduation readiness based on revenue, retail, rebooking, avg ticket, and tenure — but none of that is surfaced on this page.

The page needs to merge both systems and become the admin's central command for tracking who's progressing through levels, who's ready for promotion, and who needs coaching intervention.

## Architecture

The page will have three sections:

```text
┌─────────────────────────────────────────────────────────────────┐
│  GRADUATION TRACKER                           [Filter] [Search] │
├─────────────────────────────────────────────────────────────────┤
│  KPI Strip                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Ready to  │ │ In       │ │ Needs    │ │ No Next  │           │
│  │ Graduate  │ │ Progress │ │ Attention│ │ Level    │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
├─────────────────────────────────────────────────────────────────┤
│  Tabs: [All Stylists] [Ready to Graduate] [Assistants]          │
├─────────────────────────────────────────────────────────────────┤
│  Tab 1 & 2: Level-Based Progress                                │
│  ┌─ Stylist Row ────────────────────────────────────────────┐   │
│  │ Avatar | Name | Current → Next | Composite Bar | Status  │   │
│  │ (expandable: per-criterion progress bars, gap analysis)  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Tab 3: Legacy Assistant Checklist (existing functionality)      │
│  ┌─ Assistant Row ──────────────────────────────────────────┐   │
│  │ Avatar | Name | X/Y complete | Progress | Submissions    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Plan

### 1. Create `useTeamLevelProgress` hook

New hook that fetches ALL active stylists with their current levels and computes level progress for each. Unlike `useLevelProgress` (single user), this does a bulk fetch:
- Fetch all active `employee_profiles` with `stylist_level` and `hire_date`
- Fetch all `level_promotion_criteria` for the org
- Fetch rolling sales + appointment data for all stylists in a single batch query
- Compute per-stylist progress (reusing the same math from `useLevelProgress`)
- Return array sorted by composite score descending (closest to graduation first)
- Categorize each stylist: `ready` (100%), `in_progress` (>0%), `needs_attention` (<25%), `no_criteria` (no next level or no criteria configured)

### 2. Rebuild `GraduationTracker.tsx`

Completely rebuild the page with three tabs:

**Tab: All Stylists** — Every stylist with a level assigned, showing:
- Avatar, name, current level badge (color-coded via `getLevelColor`)
- "Current → Next" level labels
- Composite progress bar with percentage
- Status badge: "Qualified" (green), "In Progress" (primary), "Needs Attention" (amber), "At Top Level" (muted)
- Expandable row showing per-criterion progress bars (reusing `CriterionRow` pattern from `LevelProgressCard`)
- If `requires_manual_approval` and score is 100%, show "Approve Promotion" button

**Tab: Ready to Graduate** — Filtered to only stylists at 100% composite score. These are actionable — admin can review and approve promotions.

**Tab: Assistants** — Preserves the existing assistant checklist system (submission review, feedback, requirements). This keeps backward compatibility.

**KPI Strip** (above tabs):
- Ready to Graduate count
- In Progress count
- Needs Attention count (<25% or 0 active criteria)
- Total tracked stylists

**Page Header**: Search input + filter by level dropdown

### 3. Update PageExplainer

Update the `graduation-tracker` entry in `pageExplainers.ts` to reflect the new scope — it's no longer just assistants, it's team-wide level progression tracking.

## File Changes

| File | Action |
|------|--------|
| `src/hooks/useTeamLevelProgress.ts` | **Create** — Bulk-fetch all stylist level progress for the org |
| `src/pages/dashboard/admin/GraduationTracker.tsx` | **Rewrite** — Full rebuild with KPI strip, 3 tabs, level-based progress rows |
| `src/config/pageExplainers.ts` | **Modify** — Update `graduation-tracker` description |

**1 new file, 2 modified files.**

