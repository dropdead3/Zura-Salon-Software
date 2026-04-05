

# Graduation System — Retention Criteria ("Required to Stay") + Full UX/UI Audit

## What This Solves

The graduation system currently only tracks **upward progression** — who's ready for promotion. It has no concept of **minimum standards to maintain the current level**. A stylist promoted to Senior who then drops to $4k/month in revenue faces no structured accountability.

Adding "retention criteria" transforms the Graduation Tracker from a one-directional promotions dashboard into a **full level governance system** — surface who's thriving, who's slipping, and who needs intervention.

---

## Gaps Found in Current Audit

### Bug: `My Graduation` nav restricted to `stylist_assistant` only
The nav entry in `dashboardNav.ts` limits "My Graduation" to `stylist_assistant` role. Stylists at any level can't see their own level progress page. Since we added `LevelProgressCard` to this page, all stylists should have access.

### Bug: No "At Risk" or downward drift detection
The system categorizes stylists as `ready`, `in_progress`, `needs_attention`, `at_top_level`, or `no_criteria` — all relative to the **next** level. There's no evaluation against **current** level minimums.

### Gap: No retention criteria data model
The `level_promotion_criteria` table only stores "what it takes to reach this level." There's no equivalent for "what it takes to stay at this level."

### Gap: No admin surface for "who's at risk"
The Graduation Tracker has no tab or KPI for stylists falling below their current level's retention thresholds. Admins can't quickly identify who needs coaching vs. a performance conversation.

### Gap: Zura defaults don't include retention presets
The `getZuraDefaults()` function only populates promotion criteria. No defaults exist for retention.

---

## Architecture

### New Data: `level_retention_criteria` table

Parallel structure to `level_promotion_criteria`, but defines **minimums to stay** at a level rather than thresholds to reach the next one:

```text
level_retention_criteria
├── organization_id (FK → organizations)
├── stylist_level_id (FK → stylist_levels)
├── retention_enabled (boolean) ← master toggle per level
├── revenue_enabled / revenue_minimum
├── retail_enabled / retail_pct_minimum
├── rebooking_enabled / rebooking_pct_minimum
├── avg_ticket_enabled / avg_ticket_minimum
├── evaluation_window_days (30/60/90)
├── grace_period_days (how long below threshold before flagged)
├── action_type ('coaching_flag' | 'demotion_eligible')
└── is_active
```

No weights — retention is pass/fail per criterion. If any enabled criterion is below minimum, the stylist is flagged.

### New statuses in `useTeamLevelProgress`

Add two new status values:
- `at_risk` — below one or more retention criteria (within grace period)
- `below_standard` — below retention criteria past grace period (action needed)

### UI: New "At Risk" tab + KPI

```text
KPI Strip:
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Ready to │ │ In       │ │ Needs    │ │ At Risk  │ │ Below    │
│ Graduate │ │ Progress │ │ Attention│ │ ⚠️       │ │ Standard │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘

Tabs: [All Stylists] [Ready to Graduate] [At Risk] [Assistants] [Requirements]
```

**At Risk tab** shows stylists failing retention criteria with:
- Which criteria they're failing (red progress bars showing actual vs minimum)
- Days remaining in grace period
- Action type label ("Coaching recommended" vs "Demotion eligible")
- Link to 1:1 meeting prep for that stylist

### Admin Configuration: Retention tab in GraduationWizard

Add a second configuration surface within the GraduationWizard (or a parallel wizard) for each level:
- "Required to Graduate" (existing) — what it takes to reach this level
- "Required to Stay" (new) — minimums to maintain this level
- Zura defaults for retention: lower thresholds than promotion (e.g., Level 3 promotion needs $8k revenue, retention minimum is $5k)

### Stylist-Facing: Surface retention status on MyGraduation

If a stylist is below retention thresholds, show a subtle alert card on their My Graduation page: "Your [metric] is below the minimum for your current level. Focus on improving this before [grace period end]."

---

## File Changes

| File | Action |
|------|--------|
| Migration SQL | **Create** — `level_retention_criteria` table |
| `src/hooks/useLevelRetentionCriteria.ts` | **Create** — CRUD hooks for retention criteria |
| `src/hooks/useTeamLevelProgress.ts` | **Modify** — Add retention evaluation, new `at_risk` / `below_standard` statuses |
| `src/hooks/useLevelProgress.ts` | **Modify** — Add retention check for individual stylist |
| `src/components/dashboard/settings/GraduationWizard.tsx` | **Modify** — Add "Required to Stay" configuration tab with Zura defaults |
| `src/pages/dashboard/admin/GraduationTracker.tsx` | **Modify** — Add "At Risk" tab, new KPI tiles, retention-aware status badges |
| `src/components/coaching/LevelProgressCard.tsx` | **Modify** — Show retention warning when below minimums |
| `src/pages/dashboard/MyGraduation.tsx` | **Modify** — Add retention alert card |
| `src/config/dashboardNav.ts` | **Modify** — Expand My Graduation access to all stylist roles |

**1 migration, 2 new files, 7 modified files.**

