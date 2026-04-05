

# Graduation System — Pass 6: Remaining Gaps and Polish

## System Review

After 5 passes, the graduation system is comprehensive. The core architecture (promotion criteria, retention criteria, status lifecycle, audit trail, cross-surface integration, display mode toggle, KPI tiles) is solid. What remains are edge cases, missing filter options, stale copy, and a few UX polish items.

---

## Gaps Found

### 1. Status filter dropdown missing "Below Standard"
`GraduationTracker.tsx` line 740-747: The status filter `SelectContent` lists `ready`, `in_progress`, `at_risk`, `needs_attention`, `at_top_level`, `no_criteria` — but omits `below_standard`. Admins who want to filter specifically to demotion-eligible stylists cannot do so.

### 2. Graduation Tracker page explainer is generic
`pageExplainers.ts` line 459-463: The description says "Track team-wide level progression, identify who is ready for promotion, and manage assistant graduation checklists." It does not mention retention tracking, at-risk identification, or coaching workflows — all of which are now core features of this page.

### 3. MyGraduation still shows "graduation requirements" loading text
`MyGraduation.tsx` line 500: The loading state says `"Loading your graduation requirements..."` — should say something like `"Loading your level progress..."` to match the renamed page.

### 4. MyGraduation "Overall Progress" card uses stale graduation framing
Lines 461-495: The card shows checklist-based progress (requirements completed) which is the legacy assistant graduation flow. For stylists with level-based progression, this card is confusing — it shows "0/0" if no checklist requirements exist for their role. It should be conditionally hidden when no graduation requirements are configured (i.e., when the user is a non-assistant stylist using level-based progression only).

### 5. No demotion action in Graduation Tracker
When a stylist is `below_standard` (demotion eligible), the admin sees "Demotion Eligible" text in the expanded row but has no action button to actually demote. The `usePromoteLevel` hook only promotes upward. There's no `useDemoteLevel` or equivalent.

### 6. `LevelProgressCard` not used in individual staff report
The plan from Pass 2 mentioned embedding `LevelProgressCard` in the Individual Staff Report, but it should be verified that it's actually rendered there, not just imported.

---

## Plan

### 1. Add "Below Standard" to status filter
Add `<SelectItem value="below_standard">Below Standard</SelectItem>` to the status filter dropdown in `GraduationTracker.tsx`.

### 2. Update Graduation Tracker page explainer
Rewrite the `graduation-tracker` explainer to mention retention monitoring, at-risk identification, coaching actions, and demotion eligibility — reflecting the full scope of the page.

### 3. Fix stale loading/copy in MyGraduation
- Change loading text from "graduation requirements" to "level progress"
- Conditionally hide the "Overall Progress" checklist card when no graduation requirements exist for the user, so non-assistant stylists only see the level-based progress card

### 4. Add demotion capability for below-standard stylists
- Create `useDemoteLevel` hook (mirrors `usePromoteLevel` but moves the stylist down one level, records in `level_promotions` with a `direction` or negative movement indicator)
- Add a "Demote" action button in `StylistProgressRow` when `status === 'below_standard'`, with a confirmation dialog
- Note: this requires a migration to add a `direction` column to `level_promotions` (`'promotion' | 'demotion'` defaulting to `'promotion'`) so the audit trail distinguishes promotions from demotions

### 5. Verify LevelProgressCard in Individual Staff Report
Check that `LevelProgressCard` is rendered (not just imported) in the staff report page. If missing, add it.

---

## File Changes

| File | Action |
|------|--------|
| `src/pages/dashboard/admin/GraduationTracker.tsx` | **Modify** — Add "Below Standard" to status filter dropdown |
| `src/config/pageExplainers.ts` | **Modify** — Update graduation-tracker explainer copy |
| `src/pages/dashboard/MyGraduation.tsx` | **Modify** — Fix loading text, conditionally hide empty checklist card |
| `src/hooks/useDemoteLevel.ts` | **Create** — Hook for demoting a stylist with audit trail |
| `src/pages/dashboard/admin/GraduationTracker.tsx` | **Modify** — Add DemoteButton for below_standard members |

**1 new file, 3 modified files, 1 migration (add `direction` column to `level_promotions`).**

