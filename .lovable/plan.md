

# Graduation System — Pass 7: Terminology, Audit Trail, Staff Report Gap, and History Polish

## System Review

After 6 passes the core architecture is solid. This pass catches terminology inconsistencies, a missing data field in the audit trail UI, a confirmed missing integration point, and stale "graduation" language that survived earlier renames.

---

## Gaps Found

### 1. "Ready to Graduate" label should be "Ready to Promote"
The KPI strip (line 81), tab trigger (line 851), and tab comment (line 890) all say "Ready to Graduate." Since the system now governs full career progression (not just assistant graduation), this should be "Ready to Promote." The StatusBadge already says "Qualified" which is correct, but the KPI/tab language is misleading.

### 2. Promotion History does not show `direction` (promotion vs demotion)
We added a `direction` column to `level_promotions` in Pass 6, and `useDemoteLevel` writes `direction: 'demotion'`. But `PromotionRecord` in `usePromotionHistory.ts` does not include the `direction` field, and neither the admin `PromotionHistorySection` nor the stylist-facing history in `MyGraduation.tsx` distinguishes promotions from demotions visually. A demotion shows up with the same green dot and layout as a promotion.

### 3. LevelProgressCard is NOT rendered in the Individual Staff Report
The Plan from Pass 2 called for embedding `LevelProgressCard` in the individual staff report page. Searching confirms it's only rendered in `MyGraduation.tsx` and `MeetingDetails.tsx` — not in any staff report page. The links from `GraduationTracker.tsx` point to `/admin/reports/staff/:userId` but no route for that path was found, meaning those links may 404. This needs verification and either a route fix or link update.

### 4. Page title still says "Graduation Tracker"
The page header (line 787) says "Graduation Tracker" — this should be "Level Progression Tracker" or simply "Team Level Progress" to match the renamed system.

### 5. MyGraduation still shows assistant checklist sections for non-assistants
When `requirementsByCategory` is empty (no active graduation requirements), the page still renders an empty `space-y-6` div after the loading check (lines 505-527). This is harmless but sloppy — could show a contextual empty state or be hidden entirely.

---

## Plan

### 1. Rename "Ready to Graduate" to "Ready to Promote"
Update the KPI strip label, tab trigger text, and tab content comment in `GraduationTracker.tsx`.

### 2. Surface `direction` in promotion/demotion history
- Add `direction` field to `PromotionRecord` interface in `usePromotionHistory.ts`
- In `PromotionHistorySection` (GraduationTracker): show a red dot and "Demotion" label when `direction === 'demotion'`, green dot for promotions
- In `MyGraduation.tsx` promotion timeline: same visual distinction (red dot + directional arrow down for demotions)

### 3. Fix broken staff report link OR add LevelProgressCard to staff report
- First verify whether the `/admin/reports/staff/:userId` route exists. If it does, add `LevelProgressCard` to that page.
- If the route doesn't exist, update the links in `GraduationTracker.tsx` to point to an existing staff analytics surface, or remove the dead links.

### 4. Rename page title from "Graduation Tracker" to "Team Level Progress"
Update the `DashboardPageHeader` title and description in `GraduationTracker.tsx`.

### 5. Hide empty assistant requirements section for non-assistants
In `MyGraduation.tsx`, wrap the requirements-by-category section in a conditional that checks `Object.keys(requirementsByCategory).length > 0`.

---

## File Changes

| File | Action |
|------|--------|
| `src/pages/dashboard/admin/GraduationTracker.tsx` | **Modify** — Rename "Ready to Graduate" to "Ready to Promote," rename page title to "Team Level Progress," fix staff report links |
| `src/hooks/usePromotionHistory.ts` | **Modify** — Add `direction` field to `PromotionRecord` |
| `src/pages/dashboard/MyGraduation.tsx` | **Modify** — Distinguish demotions in history timeline, hide empty requirements section |

**0 new files, 3 modified files, 0 migrations.**

