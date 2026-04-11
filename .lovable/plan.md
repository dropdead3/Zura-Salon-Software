

# SEO Task Engine — Fourth Pass: Remaining Gaps vs Original Plan

## Summary

The engine is architecturally complete — all core subsystems exist (config, lib, edge functions, UI, integration components). Three previous fix passes addressed ~25 bugs and gaps. This pass identifies the remaining delta between the original specification and the current build.

---

## Still Missing Items

### M1: `SEOPageHealthBadge` still uses invalid Badge variants (`success`, `warning`)
**File**: `src/components/dashboard/seo-workshop/SEOPageHealthBadge.tsx`, line 30
```ts
const variant = score >= 80 ? 'success' : score >= 50 ? 'warning' : 'destructive';
```
B9 fixed the state machine variants but missed this component. `success` and `warning` are not valid Badge variants.
**Fix**: Map to `outline` with className overrides matching the state machine pattern.

### M2: Integration components not wired into Marketer, Tasks, or Website Builder pages
G10 was flagged in passes 2 and 3, but only `SEOInsightsCard` was wired (into `LeadershipTabContent`). Three remain:
- `SEOUnifiedTasksCard` — not imported in any Tasks page
- `SEOContentTasksCard` — not imported in any Marketer page
- `SEOPageHealthBadge` — not imported in Website Builder

**Fix**: Import and render in appropriate host pages with `VisibilityGate`.

### M3: Daily scan photo freshness tasks missing history records
**File**: `supabase/functions/seo-daily-scan/index.ts`, lines 324-342
The photo freshness detection inserts tasks but never creates `seo_task_history` entries (unlike the review detection path which was fixed). The insert doesn't even return the task ID (`.select('id').single()` is missing).
**Fix**: Add `.select('id').single()` and insert history record after.

### M4: No cron jobs scheduled for daily/weekly/monthly scans
The edge functions exist but no `pg_cron` jobs were created to invoke them. They can only be triggered manually from the Settings UI. The original plan requires: daily scans for review/photo/escalation, weekly for page/content/conversion, monthly for reprioritization/cleanup.
**Fix**: Create 3 cron jobs via the insert tool (not migration — contains project-specific URLs).

### M5: Review capture logic doesn't use satisfaction indicators or client communication eligibility
The original plan specifies: "identify eligible review candidates based on service type, location SEO deficits, cooldown history, **client communication eligibility**, and **satisfaction indicators**." The daily scan checks appointments by status=completed and applies cooldown/suppression, but does not:
- Check if the client has opted out of communications
- Check appointment satisfaction/rating indicators
- Filter by service type against location SEO deficits (it uses location-service object existence but doesn't cross-reference health scores)

**Fix**: Add filters for `client.communication_eligible` (if field exists) and check location-service review health score to prioritize deficit areas.

### M6: No manual ad-hoc task creation (E1 from pass 3 — still open)
The original plan says tasks are generated from templates, but admins should still be able to create targeted one-off tasks. No "Create Task" button exists on the Tasks tab.
**Fix**: Add a create task dialog with template selector, SEO object picker, and priority override.

### M7: No task grouping by location/service/assignee/campaign in Zura Tasks integration
The original plan says: "Inside Zura Tasks, show role-appropriate SEO work grouped by location, service, assignee, and campaign." The `SEOUnifiedTasksCard` shows a flat priority-sorted list with no grouping.
**Fix**: Add grouping options (by location, by template type) to `SEOUnifiedTasksCard`.

### M8: No draft generation flows in Marketer integration
The original plan says: "Inside Zura Marketer, expose pending content tasks and **draft generation flows**." `SEOContentTasksCard` shows content tasks but has no "Generate Draft" button or AI content generation integration.
**Fix**: Add a "Draft" button per content task that invokes AI to generate suggested content (GBP post copy, FAQ suggestions, service descriptions).

### M9: No one-click guided tasks from Website Builder page health
The original plan says: "Inside the Website Builder, expose Page Health with fix suggestions and **one-click guided tasks**." `SEOPageHealthBadge` shows health score and issues but has no action to create a fix task.
**Fix**: Add a "Fix" button in the tooltip that creates a task from the appropriate template.

### M10: Competitor gap detection not implemented in any scan
The weekly scan handles page issues, content gaps, metadata, internal links, and conversion weakness. But there is no `detectCompetitorGaps` function. The original plan requires: "competitor review velocity gaps, competitor keyword presence gaps, competitor proof-density gaps."
**Fix**: This requires a `competitors` or `competitor_benchmarks` table to exist first. Add a stub function that checks for competitor data and generates `competitor_gap_response` tasks when gaps are detected. Full implementation depends on competitor data ingestion (Phase 2+).

### M11: Service-location ranking movement tracking not implemented
The original plan says weekly scans should include "service-location ranking movement." No ranking data is stored or tracked. This requires external rank tracking integration.
**Status**: Acknowledged gap — requires external data source. Not actionable without a rank tracking API.

---

## Implementation Plan (Actionable Items)

| Priority | Item | Files |
|---|---|---|
| 1 | **M1** Fix PageHealthBadge variants | `SEOPageHealthBadge.tsx` |
| 2 | **M3** Add history records for photo freshness tasks | `seo-daily-scan/index.ts` |
| 3 | **M2** Wire integration components into host pages | Marketer page, Tasks page, Website Builder page |
| 4 | **M4** Create pg_cron jobs for scan schedules | SQL insert (not migration) |
| 5 | **M5** Add satisfaction/eligibility filters to review capture | `seo-daily-scan/index.ts` |
| 6 | **M8** Add draft generation button to content tasks card | `SEOContentTasksCard.tsx` |
| 7 | **M9** Add one-click fix from page health badge | `SEOPageHealthBadge.tsx` |
| 8 | **M6** Add manual task creation dialog | New `SEOCreateTaskDialog.tsx` |
| 9 | **M10** Add competitor gap stub in weekly scan | `seo-weekly-scan/index.ts` |

Total: ~8 files modified, 1 new component, 1 SQL insert for cron jobs.

Items M7 (task grouping) and M11 (ranking movement) are deferred — M7 is a UX enhancement, M11 requires external integration.

