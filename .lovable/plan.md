

# Phase 2: Revenue Attribution + "Do It For Me" Automation

## Overview

Two upgrades that transform the SEO engine from a task system into a revenue-connected, partially automated growth engine.

---

## Phase 2A — Revenue Attribution Layer

### What it does
Connects POS appointment/transaction revenue to SEO objects (service-location pairs), then surfaces revenue metrics on SEO object cards, campaign cards, and the dashboard.

### Database Changes

**New table: `seo_object_revenue`**
- Stores rolling 30d revenue snapshots per SEO object
- Columns: `id`, `seo_object_id` (FK), `organization_id`, `period_start`, `period_end`, `total_revenue`, `transaction_count`, `computed_at`
- Populated by a new edge function or by extending the existing `seo-daily-scan`

**New columns on `seo_campaigns`:**
- `actual_revenue_impact` (jsonb, nullable) — stores measured revenue delta post-campaign

### New Files

| File | Purpose |
|---|---|
| `src/hooks/useSEOObjectRevenue.ts` | Query `seo_object_revenue` for display on object cards |
| `supabase/functions/seo-revenue-snapshot/index.ts` | Edge function: queries `daily_sales_summaries` by service+location, maps to `seo_objects` via `object_key`, upserts rolling 30d revenue snapshots |

### Modified Files

| File | Change |
|---|---|
| `src/components/dashboard/seo-workshop/SEOEngineObjects.tsx` | Show revenue badge on each object card (e.g. "$18,400 / 30d") |
| `src/components/dashboard/seo-workshop/SEOCampaignDetailDialog.tsx` | Show estimated ROI from `expected_metrics` and actual revenue delta if available |
| `src/components/dashboard/seo-workshop/SEOEngineDashboard.tsx` | Add "Revenue Attributed" KPI tile |

### Revenue Mapping Logic
- `seo_objects.object_key` follows the pattern `location_service:{location_id}:{service_category}`
- The snapshot function matches against `daily_sales_summaries` by `location_id` and `service_category`
- No POS adapter changes needed — uses existing normalized sales data

---

## Phase 2B — "Do It For Me" Layer

### What it does
Adds AI-powered action buttons on eligible SEO task types. The user clicks "Generate + Preview", reviews the output, then clicks "Apply" to execute. Follows the autonomy model: Recommend → Preview → Approve → Execute.

### Eligible Task Templates (Phase 1)
Only templates where AI content generation is safe and useful:

| Template | Action | Output |
|---|---|---|
| `faq_expansion` | Generate FAQs | 3-5 FAQ Q&A pairs for the service page |
| `gbp_post` | Generate GBP Post | Post title + body text |
| `service_description_rewrite` | Generate Description | Rewritten service description |
| `review_request` | Draft Review Request | Personalized message to top 5 recent clients |

### New Edge Function

**`supabase/functions/seo-generate-content/index.ts`**
- Accepts: `{ templateKey, objectKey, objectLabel, locationName, context }`
- Uses Lovable AI (gemini-3-flash-preview) to generate content specific to the template type
- Returns: `{ generated: true, content: { ... }, preview: string }`
- Does NOT auto-apply — returns content for user review

### New Files

| File | Purpose |
|---|---|
| `supabase/functions/seo-generate-content/index.ts` | AI content generation for eligible task types |
| `src/hooks/useSEOGenerateContent.ts` | Mutation hook to call the edge function |
| `src/components/dashboard/seo-workshop/SEOTaskAutoAction.tsx` | "Generate + Preview" UI component with preview panel and "Apply" button |

### Modified Files

| File | Change |
|---|---|
| `src/components/dashboard/seo-workshop/SEOTaskDetailDialog.tsx` | Add `SEOTaskAutoAction` component for eligible templates when task is in active state |
| `src/config/seo-engine/seo-task-templates.ts` | Add `aiActionEligible: boolean` and `aiActionLabel: string` fields to template config |

### UX Flow
1. User opens an eligible task → sees "Generate Content" button below task details
2. Click → spinner → AI-generated content appears in a preview card
3. User reviews → clicks "Apply to Task" or "Regenerate"
4. "Apply" stores the generated content in `task.ai_generated_content` and optionally transitions task to `awaiting_verification`
5. Content is never auto-published — always requires human review

### Guardrails
- Only templates with `aiActionEligible: true` show the button
- Generated content is stored but never auto-published to external systems
- Rate limited: max 5 generations per task (prevents abuse)
- All generations logged in `seo_task_history` for audit

---

## Build Order
1. DB migration (new table + column)
2. Revenue snapshot edge function
3. `useSEOObjectRevenue` hook + Object cards update
4. Campaign + Dashboard revenue display
5. `seo-generate-content` edge function
6. Template config update (`aiActionEligible`)
7. `SEOTaskAutoAction` component
8. Wire into `SEOTaskDetailDialog`

