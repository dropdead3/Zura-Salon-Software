

# SEO Task Engine — Full Gap and Bug Analysis

## Critical Bugs

### B1: Operator precedence bug in monthly scan reprioritization
**File**: `supabase/functions/seo-monthly-scan/index.ts`, line 325
```
(task.priority_factors as any)?.opportunity || 0.5 * 0.25 * 100 +
```
The `||` operator has lower precedence than `+` and `*`, so this expression evaluates incorrectly. It should be:
```
((task.priority_factors as any)?.opportunity ?? 0.5) * 0.25 * 100 +
```
The entire formula on lines 323-329 is also structurally wrong — the weighted factors don't add up correctly. Each factor should be `factor * weight * 100` but the `||` splits the expression.

### B2: Orphaned task history record in daily scan
**File**: `supabase/functions/seo-daily-scan/index.ts`, line 256
```js
task_id: crypto.randomUUID(), // Will be replaced by actual task ID after insert
```
This inserts a history record with a random UUID that doesn't match the actual task just created. The insert on line 235 doesn't return the created task's ID. Fix: add `.select('id').single()` to the insert, then use the returned ID.

### B3: Inconsistent CORS handling across edge functions
- `seo-score-calculator` uses `requireAuth` + `getCorsHeaders` (auth-based, origin-aware)
- `seo-daily-scan`, `seo-weekly-scan`, `seo-monthly-scan` use `wildcardCorsHeaders` with no auth
- The daily/weekly/monthly scans accept arbitrary `organizationId` from the request body with **no authentication** — anyone can trigger scans for any org using the service role key embedded in the function. While this is needed for cron, the manual trigger path from the UI should validate the caller's org membership.

### B4: Bootstrap creates tasks with `primary_seo_object_id: null`
**File**: `src/components/dashboard/seo-workshop/SEOBootstrapDialog.tsx`, line 111
If the `seo_objects` upsert fails to return a row (e.g. RLS blocks it), `seoObj` is null, and the task insert uses `null` for `primary_seo_object_id` — but the DB column is `NOT NULL`. This will throw a Postgres constraint error silently with no user feedback beyond a generic toast.

## Significant Gaps

### G1: Template seed data never executed
The `seo_task_templates` table was created but never seeded with the 16 template rows. The edge functions query this table (`WHERE template_key = 'review_request' AND is_active = true`) and return early if no row exists. **All scan-generated tasks will fail** until templates are seeded.

### G2: `useSEOTasks` query uses `seo_tasks` join that may not match
**File**: `src/hooks/useSEOTasks.ts`, line 15
```ts
.select('*, seo_objects!seo_tasks_primary_seo_object_id_fkey(...)')
```
This relies on PostgREST inferring the FK name `seo_tasks_primary_seo_object_id_fkey`. If the auto-generated FK name differs (which happens with `IF NOT EXISTS` tables), this will silently fail and `seo_objects` will be `null` on every task.

### G3: `content_refresh` template requires `content_diff` proof type, but `ProofArtifact.type` doesn't include it
**File**: `src/lib/seo-engine/seo-completion-validator.ts`, line 19
```ts
type: 'photo' | 'screenshot' | 'url' | 'text' | 'action_summary';
```
The `content_refresh` template's `proofRequirements` include `'content_diff'` which doesn't match any allowed type. The validator's fallback logic (line 69: `a.type === req || a.type === 'action_summary'`) means only `action_summary` uploads will satisfy it, which is misleading.

### G4: Health score accumulation without cleanup
Every time the score calculator runs, it **inserts** new rows into `seo_health_scores` — it never deletes or upserts. Over time this table will grow linearly with `objects × domains × scan_runs`. There's no retention policy or deduplication.

### G5: Opportunity/risk score accumulation
Same issue as G4 — `seo_opportunity_risk_scores` also only inserts, never cleans up.

### G6: Campaign state transitions bypass state machine in monthly scan
**File**: `supabase/functions/seo-monthly-scan/index.ts`, line 228
The monthly scan directly updates campaign status without validating against `CAMPAIGN_STATE_TRANSITIONS`. For example, it could transition `at_risk` directly to `abandoned` (allowed) but also `at_risk` to `completed` without checking if that's valid.

### G7: Bootstrap dialog uses mock services/stylists
**File**: `src/components/dashboard/seo-workshop/SEOBootstrapDialog.tsx`, lines 39-48
Hardcoded `mockServices` and `mockStylists` are used instead of real org data. The bootstrap will always generate the same tasks regardless of what the salon actually offers.

### G8: No `performed_by` on edge function history inserts
The daily/weekly/monthly scan edge functions insert `seo_task_history` records without setting `performed_by`. This is acceptable for automated actions but should explicitly set a system identifier for auditability.

### G9: `useSEOHealthSummary` hook missing
The dashboard imports `useSEOHealthSummary` from `useSEOHealthScores` — need to verify this export exists and correctly aggregates scores.

## Minor Issues

- **M1**: All UI components use `as any` extensively (~50 instances). This bypasses TypeScript's type safety for all DB query results.
- **M2**: `SEOEngineSettings.tsx` imports `toast` from `sonner` while all other SEO components use `@/hooks/use-toast` — inconsistent toast system.
- **M3**: Task detail dialog doesn't reset `uploadedProofs` and `managerApproved` state when switching between tasks (the dialog unmounts/remounts via `task` prop change, but state could persist if React reuses the component).
- **M4**: The `seo_tasks` table has a `CHECK` constraint on `priority_score` (`CHECK (priority_score >= 0 AND priority_score <= 100)`) which is fine as-is but the `seo_health_scores` table also uses `CHECK` on score — per project doctrine, validation triggers are preferred over CHECK constraints.
- **M5**: No pagination on task list, object list, or campaign list — all fetch unlimited rows.
- **M6**: Edge function `seo-score-calculator` references `website_page_versions` and `employee_profiles` tables — need to verify these exist and have the expected columns.

## Proposed Fix Order

1. **B1** — Fix priority formula (critical math bug)
2. **B2** — Fix orphaned history record
3. **G1** — Seed template data via migration
4. **B3** — Add auth to scan triggers when called from UI
5. **B4** — Guard against null SEO object in bootstrap
6. **G3** — Add `content_diff` to ProofArtifact type union
7. **G4/G5** — Add score retention (delete scores older than N runs)
8. **G7** — Replace mock data with real org services/stylists
9. **G6** — Validate campaign transitions in monthly scan
10. **M2** — Standardize toast import
11. **G2** — Use explicit FK hint or verify the join name
12. **M5** — Add pagination limits

## File Changes Summary

| File | Changes |
|---|---|
| `supabase/functions/seo-monthly-scan/index.ts` | Fix priority formula (B1), validate campaign transitions (G6) |
| `supabase/functions/seo-daily-scan/index.ts` | Fix orphaned history record (B2) |
| New migration SQL | Seed 16 task templates (G1), add score cleanup function (G4/G5) |
| `src/components/dashboard/seo-workshop/SEOBootstrapDialog.tsx` | Replace mocks with real data (G7), guard null object (B4) |
| `src/lib/seo-engine/seo-completion-validator.ts` | Add `content_diff` type (G3) |
| `src/components/dashboard/seo-workshop/SEOEngineSettings.tsx` | Fix toast import (M2), add auth to scan triggers (B3) |
| `src/hooks/useSEOTasks.ts` | Verify/fix FK join hint (G2) |

Total: ~8 files modified, 1 new migration.

