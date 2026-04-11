

# Gap & Bug Audit — Phase 1 + Phase 2 SEO Engine

## Bugs Found

### 1. Business Value Threshold Comparison is Wrong (CRITICAL)
**File**: `src/lib/seo-engine/seo-suppression-engine.ts` line 81

`MIN_BUSINESS_VALUE_THRESHOLD` is `0.2` (a 0–1 scale). The check compares:
```
ctx.businessValueScore < MIN_BUSINESS_VALUE_THRESHOLD * 100
```
This evaluates to `businessValueScore < 20`. But `businessValueScore` in the `SuppressionContext` interface is documented as a raw number — and in `seo-priority-calculator.ts` it's normalized via `input.businessValueScore / 100`, confirming it's a **0–100 scale** input.

So the check is **actually correct** (`0.2 * 100 = 20`, comparing against a 0–100 score). No bug here on closer inspection. ✅

### 2. `completedTaskIds` Computed But Never Used (Dead Code)
**File**: `src/components/dashboard/seo-workshop/SEOCampaignDetailDialog.tsx` lines 78–81

`completedTaskIds` is computed via `useMemo` but never referenced anywhere. The `IMPACT_CATEGORY_LABELS` import is also unused. `useSEOTaskImpact` is imported but never called. This was clearly intended as campaign-level impact rollup but was left unfinished.

**Fix**: Either wire up impact aggregation across completed tasks, or remove the dead code + unused imports.

### 3. Revenue Snapshot Edge Function: RLS Blocks Service-Role Upserts
**File**: `supabase/functions/seo-revenue-snapshot/index.ts`

The function uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS, so upserts should work. ✅ However, the upsert uses `onConflict: "seo_object_id,period_start,period_end"` — this references columns in the unique index `idx_seo_object_revenue_unique`, but Supabase upsert requires a **unique constraint** (not just a unique index). The migration creates a `UNIQUE INDEX` not a `UNIQUE CONSTRAINT`.

**Fix**: Change the migration index to an `ALTER TABLE ... ADD CONSTRAINT` or add a proper unique constraint. Alternatively, the upsert may silently fail or insert duplicates.

### 4. `seo-generate-content`: `seo_task_history` May Not Have `action` Column Matching
**File**: `supabase/functions/seo-generate-content/index.ts` line 72

The rate-limit check queries `seo_task_history` filtering `.eq("action", "ai_content_generated")`. Need to verify this column exists and accepts arbitrary string values. The insert on line 156–161 also uses `performed_by: null` — if this column has a NOT NULL constraint, the insert will fail silently (service role still gets the error).

**Fix**: Verify schema, and pass the authenticated user ID as `performed_by` instead of null.

### 5. Revenue Snapshot: `transaction_items` Table Assumption
**File**: `supabase/functions/seo-revenue-snapshot/index.ts` line 42–48

The function queries `transaction_items` with columns `location_id`, `item_category`, `total_amount`, `tax_amount`, `transaction_date`. Need to confirm this table exists and has these columns. If the POS data model uses a different table (e.g., `daily_sales_summaries` or `appointments`), this will return empty results.

### 6. `SEOTaskAutoAction`: `task.location_id` Used as Location Name
**File**: `src/components/dashboard/seo-workshop/SEOTaskAutoAction.tsx` line 42

The comment says "Simplified; could resolve location name" but passes a UUID (`task.location_id`) as `locationName` to the AI. The AI prompt then says `Location: {some UUID}` which produces poor-quality content.

**Fix**: Resolve location name before passing to the edge function, or fetch it in the edge function.

### 7. Revenue Dashboard KPI: Extra `<p>` Tag Outside Icon Container
**File**: `src/components/dashboard/seo-workshop/SEOEngineDashboard.tsx` line 145

The "30d rolling" subtitle `<p>` tag is inside the inner `<div>` alongside the value, which is correct structurally, but it renders **outside** the icon+text block, creating visual inconsistency with the other 4 KPI tiles that don't have subtitles. Minor layout issue.

## Gaps Found

### 8. No Momentum Data Hook Exists
The `seo-momentum-calculator.ts` is pure computation logic. There's no `useSEOMomentum` hook to fetch the input data (task completion velocity, review deltas, content freshness, competitor distance) from the database. The dashboard has a placeholder comment (lines 152–153) but no actual integration.

### 9. Campaign Impact Rollup Not Wired
As noted in bug #2, the campaign detail dialog imports impact-related code but doesn't display any impact data. For completed campaigns, there should be an aggregated impact section.

### 10. Revenue Snapshot Has No Trigger/Schedule
The `seo-revenue-snapshot` edge function exists but is never invoked. There's no pg_cron job, no UI button, and no call from any other function. Revenue data will always be empty.

---

## Proposed Fixes

| # | Fix | File |
|---|---|---|
| 2 | Remove dead `completedTaskIds`, unused `IMPACT_CATEGORY_LABELS` and `useSEOTaskImpact` imports from campaign dialog | `SEOCampaignDetailDialog.tsx` |
| 3 | Change unique index to a proper unique constraint in migration | New migration SQL |
| 4 | Verify `seo_task_history.performed_by` allows null; if not, pass user context from auth header | `seo-generate-content/index.ts` |
| 6 | Resolve location name from `locations` table in the edge function instead of passing UUID | `seo-generate-content/index.ts` |
| 8 | Create `useSEOMomentum` hook that queries task completion counts, review deltas, etc. | New: `src/hooks/useSEOMomentum.ts` |
| 10 | Add revenue snapshot invocation to the existing `seo-daily-scan` edge function or create a schedule | Edge function update |

Items 8 and 10 are the largest gaps — without them, Momentum Scores and Revenue Attribution will show "—" in the UI permanently.

I recommend fixing bugs 2, 3, 4, and 6 first (quick wins), then tackling gaps 8 and 10 to make the features actually functional.

