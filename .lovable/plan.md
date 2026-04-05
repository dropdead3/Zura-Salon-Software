

# Graduation System — Pass 3: Remaining Gaps and Enhancements

## Current State Summary

The system now has: promotion criteria wizard with Zura defaults, retention criteria ("Required to Stay") with admin config, At Risk tab on Graduation Tracker, LevelProgressCard on MyGraduation/MeetingDetails/IndividualStaffReport, promotion approval with audit trail, and nav access expanded to all stylists.

---

## Gaps Found

### 1. MyGraduation page explainer is stale
`pageExplainers.ts` line 106-109 still says "assistant-to-stylist graduation program." Should reflect that all stylists now see level progress + retention status here, not just assistants doing checklists.

### 2. No promotion history visible anywhere
The `level_promotions` table records every approval, but this data is never queried or displayed. Admins can't see "who was promoted when, and by whom." Stylists can't see their own promotion timeline. This audit trail exists in the database but is invisible.

### 3. PDF export doesn't include retention criteria
`LevelRequirementsPDF.ts` only shows promotion criteria. A salon owner printing the level roadmap for their team handbook gets half the picture — no "Required to Stay" column showing minimums.

### 4. At Risk tab has no deep-link to coaching
When admin sees a stylist at risk, there's no path to action. Should link to schedule a 1:1 meeting or view that stylist's individual report for coaching context.

### 5. LevelProgressCard description is wrong when no next level
Line 76: `{progress.currentLevelLabel} → {progress.nextLevelLabel}` renders "Senior → null" when a top-level stylist has retention issues. Should show "Senior — Retention Status" instead.

### 6. No stylist-facing retention alert copy on MyGraduation
The `LevelProgressCard` shows retention warnings, but there's no contextual guidance below it. A stylist seeing "Below minimum standards" gets no actionable advice — should have a brief explanation of what this means for them and what to focus on.

### 7. Graduation Tracker row doesn't link to stylist profile
Admin sees a name and stats but can't click through to that stylist's individual report or meeting prep. Each row should have a subtle link icon.

---

## Plan

### 1. Add promotion history hook + display
- Create `usePromotionHistory.ts` — query `level_promotions` for a user or for the whole org
- Add a "Promotion History" section in the expanded `StylistProgressRow` on Graduation Tracker (shows past promotions with date and approver)
- Add promotion timeline to MyGraduation so stylists see their advancement history

### 2. Add retention criteria to PDF export
- Extend `LevelRequirementsPDFOptions` to accept `LevelRetentionCriteria[]`
- Add a second table or additional columns showing "Required to Stay" minimums per level
- Update the StylistLevels page PDF export call to pass retention data

### 3. Fix LevelProgressCard for top-level + retention-only
- When `nextLevelLabel` is null but retention is at risk, show "Current Level — Retention Status" instead of arrow notation
- Conditionally hide the "Qualified" badge when there's no next level

### 4. Add action links to At Risk rows
- Add a "Schedule 1:1" link (navigates to meeting creation with that stylist pre-selected)
- Add a "View Report" link (navigates to individual staff report)

### 5. Add stylist-facing retention guidance on MyGraduation
- Below the `LevelProgressCard`, if retention is at risk, render a subtle advisory card explaining what metrics need improvement, in Zura's protective tone (not punitive)

### 6. Add row click-through to stylist report
- Make the stylist name in `StylistProgressRow` a link to their individual staff report

### 7. Update stale page explainer
- Rewrite the `my-graduation` explainer to reflect level progress + retention awareness

---

## File Changes

| File | Action |
|------|--------|
| `src/hooks/usePromotionHistory.ts` | **Create** — Query level_promotions for display |
| `src/pages/dashboard/admin/GraduationTracker.tsx` | **Modify** — Add promotion history in expanded row, action links on At Risk rows, name links to staff report |
| `src/pages/dashboard/MyGraduation.tsx` | **Modify** — Add promotion timeline, retention guidance card |
| `src/components/coaching/LevelProgressCard.tsx` | **Modify** — Fix top-level description, handle null nextLevelLabel gracefully |
| `src/components/dashboard/settings/LevelRequirementsPDF.ts` | **Modify** — Add retention criteria columns to PDF |
| `src/pages/dashboard/admin/StylistLevels.tsx` | **Modify** — Pass retention data to PDF export |
| `src/config/pageExplainers.ts` | **Modify** — Update my-graduation explainer |

**1 new file, 6 modified files.**

