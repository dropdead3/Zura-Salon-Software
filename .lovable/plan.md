

# Wire Staff Reports & Add Level Graduation to 1:1 Reports

## Problem Summary

From the screenshot, the Individual Staff Report for "Gavin E." shows all zeros. Two root causes:

1. **The report queries by `phorest_staff_id` correctly**, but the date filter is set to "Today" (a Sunday with no appointments). The data IS there — Gavin has 59 appointments and $6,497 revenue in the last 5 weeks. The report works when a meaningful date range is selected.

2. **The name still shows "GAVIN E."** — the `formatDisplayName` change only applies when both `fullName` and `displayName` flow through the utility. The profile banner in IndividualStaffReport constructs the name via `formatDisplayName(profileData.full_name, profileData.display_name)` which should now return the full name. The staff selector dropdown also shows `member.display_name || member.full_name` directly. The "GAVIN E." in the banner header likely comes from the `data.profile.name` which was set before the fix was deployed — this should resolve automatically.

3. **Level graduation stats are not included in the 1:1 meeting Report Builder** — the `LevelProgressCard` is shown on the meeting details page, but its data (composite score, per-criterion gaps, commission uplift) is NOT included in the generated check-in report that gets sent to the team member.

## Plan

### 1. Add Level Progress Data to the 1:1 Report Builder

**File: `src/components/coaching/ReportBuilder.tsx`**

Import `useLevelProgress` and add a "Level Progress" section to the generated report content. Include:
- Current level → Next level label
- Composite score (e.g., "72% ready")
- Per-criterion breakdown showing current vs target and gap remaining
- Commission uplift estimate ("At next level, your commission increases from X% to Y% — estimated +$Z/month based on current revenue")
- Retention warnings if at risk
- Add an "Include Level Progress" checkbox next to the existing "Include Compliance Data" checkbox

**File: `src/hooks/useLevelProgress.ts`** — No changes needed, already returns all required data.

### 2. Add Commission Uplift Intelligence to LevelProgressCard

**File: `src/components/coaching/LevelProgressCard.tsx`**

Add a small "Income Opportunity" section below the criteria progress bars:
- Show current commission rate vs next level's rate
- Calculate monthly uplift estimate based on the user's trailing revenue
- This gives stylists a concrete dollar amount incentive to focus on graduation

This requires importing `useResolveCommission` and `useStylistLevels` to look up commission rates for current vs next level.

### 3. Enhance the Meeting Details Level Progress Visibility

**File: `src/pages/dashboard/MeetingDetails.tsx`**

The `LevelProgressCard` is currently only visible to coaches (`canManage`). Also show it (non-compact) to the team member themselves, so both parties see the same graduation data during the meeting.

## Files Changed

| File | Change |
|---|---|
| `src/components/coaching/ReportBuilder.tsx` | Add level progress + commission uplift to generated report content |
| `src/components/coaching/LevelProgressCard.tsx` | Add "Income Opportunity" section with commission uplift estimate |
| `src/pages/dashboard/MeetingDetails.tsx` | Show LevelProgressCard to both coach and team member |

3 files, no database changes. The Individual Staff Report data issue is a date-range selection issue (user selected "Today" on a day with no appointments) — not a wiring bug.

