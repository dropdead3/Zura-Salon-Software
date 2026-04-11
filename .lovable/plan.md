

# Autonomous Growth Engine

## What It Builds

An autonomous execution layer on top of the existing SEO Task Engine, Revenue Attribution, and Predicted Revenue Engine. Zura detects opportunities, auto-executes high-confidence actions within guardrails, queues human-required tasks, logs everything, and delivers a daily growth report.

## Architecture

```text
Daily Scan (existing)
     │
     ├── Detect Opportunities (existing)
     │
     ├── NEW: Autonomy Classification
     │   ├── Fully Autonomous → Auto-Execute → Log → Measure
     │   ├── Assisted → Generate Content → Queue for Approval
     │   └── Human-Only → Assign → Enforce
     │
     ├── NEW: Rate Limiter + Brand Guardrails
     │
     ├── NEW: Execution Logger (seo_autonomous_actions)
     │
     └── NEW: Daily Growth Report (notification + dashboard card)
```

## Autonomy Classification

### Fully Autonomous (execute immediately, no human)
- `review_request` — send via existing channels
- `gbp_post` — generate + publish (AI content already built)
- `metadata_fix` — update meta descriptions
- `internal_linking` — inject internal links
- `faq_expansion` — generate + inject FAQs
- `booking_cta_optimization` — optimize CTA structure

### Assisted (generate → preview → approve)
- `before_after_publish` — needs photo selection approval
- `service_description_rewrite` — brand-sensitive copy
- `content_refresh` — requires manager sign-off
- `local_landing_page_creation` — new page creation

### Human-Only (assign + enforce only)
- `photo_upload` — requires physical photography
- `stylist_spotlight_publish` — requires stylist participation
- `competitor_gap_response` — strategic decision

## Database Changes

**New table: `seo_autonomous_actions`**
- `id`, `organization_id`, `task_id`, `template_key`, `action_type` (auto_executed | generated_for_approval | assigned_human)
- `executed_at`, `content_applied` (jsonb), `confidence_score`, `predicted_lift`
- `status` (executed | rolled_back | pending_approval | approved | rejected)
- `rollback_data` (jsonb — stores pre-change state for reversal)
- `measured_impact` (jsonb — populated post-execution by attribution system)

**New table: `seo_growth_reports`**
- `id`, `organization_id`, `report_date`, `actions_taken` (jsonb), `impact_summary` (jsonb), `remaining_opportunity`, `next_best_action` (jsonb), `created_at`

**New columns on `seo_engine_settings` schema:**
- `autonomy_enabled` (boolean, default false) — master kill switch
- `autonomy_aggressiveness` (1-5, default 2) — controls rate limits
- `autonomy_review_requests_per_day` (number, default 5)
- `autonomy_posts_per_week` (number, default 2)
- `autonomy_page_edits_per_day` (number, default 3)
- `autonomy_min_confidence` (number, default 0.6) — below this, require approval

## New Files

| File | Purpose |
|---|---|
| `src/config/seo-engine/seo-autonomy-config.ts` | Autonomy classification map, rate limit defaults, confidence thresholds |
| `supabase/functions/seo-autonomous-execute/index.ts` | Edge function: daily autonomous execution loop — classify eligible tasks, auto-execute via `seo-generate-content`, log actions, update predictions |
| `supabase/functions/seo-growth-report/index.ts` | Edge function: compile daily growth report from `seo_autonomous_actions` + attribution data, store + notify owner |
| `src/hooks/useSEOAutonomousActions.ts` | Query autonomous action log + growth reports |
| `src/components/dashboard/seo-workshop/SEOGrowthReport.tsx` | Dashboard card: "Zura Growth Report — Today" showing actions taken, impact, remaining opportunity, next best action |
| `src/components/dashboard/seo-workshop/SEOAutonomySettings.tsx` | Settings panel: enable/disable auto mode, set aggressiveness, rate limits, confidence threshold |

## Modified Files

| File | Change |
|---|---|
| `src/config/seo-engine/seo-settings-schema.ts` | Add autonomy settings to schema |
| `src/config/seo-engine/seo-task-templates.ts` | Add `autonomyLevel` field to template config |
| `supabase/functions/seo-daily-scan/index.ts` | Add Step 6: call `seo-autonomous-execute` after task generation |
| `src/components/dashboard/seo-workshop/SEOEngineDashboard.tsx` | Add `SEOGrowthReport` card at top of dashboard |

## Autonomous Execution Flow (Edge Function)

1. Check `autonomy_enabled` setting — exit if off
2. Fetch all `detected` + `queued` tasks for the org
3. For each task, check `autonomyLevel` from template config
4. **Fully Autonomous**: Check rate limits (daily/weekly caps per template) → Check confidence (predicted lift confidence ≥ min threshold) → Call `seo-generate-content` for content → Apply content to task → Transition task to `completed` → Log in `seo_autonomous_actions` with rollback data
5. **Assisted**: Generate content → Store on task → Transition to `awaiting_verification` → Notify owner
6. **Human-Only**: Assign via existing assignment resolver → Skip
7. Update `seo_growth_reports` with day's activity

## Safety Layer

- **Master kill switch**: `autonomy_enabled` defaults to OFF — owner must explicitly enable
- **Rate limits**: Configurable per-template daily/weekly caps (e.g., max 5 review requests/day, 2 posts/week, 3 page edits/day)
- **Confidence gate**: Actions only auto-execute when predicted revenue confidence ≥ threshold (default 0.6)
- **Rollback**: Every auto-executed change stores `rollback_data` — a "Undo" button in the action log reverses the change
- **Brand guardrails**: AI content generation already enforces tone via system prompts; autonomous mode uses the same `seo-generate-content` function
- **Audit trail**: Every autonomous action logged in `seo_autonomous_actions` + `seo_task_history`

## Growth Report (Daily Notification)

Compiled by `seo-growth-report` edge function, triggered after autonomous execution:

```text
Zura Growth Report — April 11

Yesterday:
• Sent 5 review requests (Gilbert Extensions, Mesa Balayage)
• Published 1 Google Business post (Gilbert Location)
• Updated 2 service page meta descriptions

Impact:
• +2 new reviews received
• +8% page engagement (estimated)

Opportunity:
• +$6,200 remaining this month

Next Best Action:
• Upload 3 extension photos (human required)
```

Delivered as:
1. In-app notification to owner
2. Dashboard card (`SEOGrowthReport`) — always-visible at top of SEO dashboard

## Build Order

1. DB migration (new tables + settings)
2. `seo-autonomy-config.ts` (classification map + defaults)
3. Template config update (`autonomyLevel` field)
4. Settings schema update (autonomy settings)
5. `seo-autonomous-execute` edge function
6. `seo-growth-report` edge function
7. `useSEOAutonomousActions` hook
8. `SEOGrowthReport` dashboard card
9. `SEOAutonomySettings` panel
10. Wire autonomous execute into daily scan

## Technical Notes

- Autonomous execution reuses existing `seo-generate-content` edge function for AI content — no new AI integration
- Revenue prediction data feeds confidence scores into autonomy decisions
- The system follows the platform's autonomy model: Recommend → Simulate → Request Approval → Execute (within guardrails)
- Owner controls everything via settings — autonomy never activates without explicit opt-in
- All autonomous decisions are deterministic (template classification, rate limits, confidence thresholds) — AI only generates content

