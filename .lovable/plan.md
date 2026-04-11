

# Zura SEO Task Engine — Implementation Plan

## Assessment

This is a **full product vertical** spanning 15+ database tables, 3+ edge functions, 30+ config modules, and 40+ UI components. The existing SEO Workshop is a static checklist with ~27 manual items and a simple completions table. The existing `operational_tasks` infrastructure (state machine, history, escalation) provides a strong foundation to build on rather than reinvent.

The scope described is approximately 3–4 months of focused engineering. To ship incrementally and avoid overbuilding ahead of data availability, this plan is structured in **4 phases**, each delivering a usable vertical slice.

---

## Phase 1: Foundation — SEO Object Model, Health Scoring, and Task Templates (Week 1–3)

### Database (8 new tables, 2 altered)

**`seo_objects`** — The universal entity that SEO work attaches to.
- `id`, `organization_id`, `location_id`, `object_type` (enum: `location`, `service`, `location_service`, `stylist_page`, `website_page`, `gbp_listing`, `review_stream`, `competitor`), `object_key` (composite natural key), `label`, `metadata` (JSONB), `created_at`
- Unique on `(organization_id, object_type, object_key)`

**`seo_health_scores`** — Per-object, per-domain scores (0–100).
- `id`, `seo_object_id`, `domain` (enum: `review`, `page`, `local_presence`, `content`, `competitive_gap`, `conversion`), `score`, `raw_signals` (JSONB), `scored_at`, `organization_id`
- One row per object per domain per scan run

**`seo_opportunity_risk_scores`** — Per location-service pair.
- `id`, `organization_id`, `location_id`, `service_id`, `opportunity_score`, `risk_score`, `factors` (JSONB), `scored_at`

**`seo_task_templates`** — Reusable deterministic blueprints.
- `id`, `template_key` (unique), `label`, `description_template`, `task_type`, `trigger_domain`, `trigger_conditions` (JSONB), `assignment_rules` (JSONB), `due_date_rules` (JSONB), `completion_criteria` (JSONB), `recurrence_rules` (JSONB), `dependency_rules` (JSONB), `suppression_rules` (JSONB), `escalation_rules` (JSONB), `expected_impact_category`, `priority_weight_overrides` (JSONB), `is_active`
- Seeded with 16 templates (Review Request, Review Response, Photo Upload, GBP Post, Service Page Update, Page Completion, Metadata Fix, Internal Linking, Before/After Publish, Stylist Spotlight Publish, FAQ Expansion, Competitor Gap Response, Booking CTA Optimization, Content Refresh, Local Landing Page Creation, Service Description Rewrite)

**`seo_tasks`** — Generated task instances (extends `operational_tasks` pattern but SEO-specific).
- `id`, `organization_id`, `location_id`, `template_key` (FK to seo_task_templates), `primary_seo_object_id` (FK), `secondary_seo_object_id` (FK, nullable), `assigned_to`, `assigned_role`, `assigned_at`, `due_at`, `priority_score` (0–100), `priority_factors` (JSONB), `status` (enum: `detected`, `queued`, `assigned`, `in_progress`, `awaiting_dependency`, `awaiting_verification`, `completed`, `overdue`, `escalated`, `suppressed`, `canceled`), `escalation_level`, `proof_artifacts` (JSONB), `completion_verified_at`, `completion_method` (`system` | `manual_approved`), `suppression_reason`, `cooldown_until`, `campaign_id` (FK, nullable), `ai_generated_content` (JSONB — title, explanation, draft copy), `created_at`, `updated_at`, `resolved_at`, `resolved_by`

**`seo_task_history`** — Full audit trail mirroring `operational_task_history`.
- `id`, `task_id`, `action`, `previous_status`, `new_status`, `performed_by`, `notes`, `created_at`

**`seo_task_dependencies`** — Hard and soft deps.
- `id`, `task_id`, `depends_on_task_id`, `dependency_type` (`hard` | `soft`), `created_at`

**`seo_campaigns`** — Bundled task groups.
- `id`, `organization_id`, `location_id`, `title`, `objective`, `status` (enum: `planning`, `active`, `blocked`, `at_risk`, `completed`, `abandoned`), `owner_user_id`, `expected_metrics` (JSONB), `window_start`, `window_end`, `created_at`, `updated_at`

**`seo_task_impact`** — Post-completion measurement.
- `id`, `task_id`, `measurement_window` (`7d` | `30d` | `90d`), `metrics` (JSONB — review_velocity_delta, keyword_mentions_delta, page_traffic_delta, booking_conversion_delta, etc.), `contribution_confidence`, `measured_at`

**Alter `operational_tasks`**: No changes — SEO tasks get their own table to avoid polluting the existing Color Bar task system with SEO-specific fields.

### Config Layer (client-side, `src/config/seo-engine/`)

- `seo-problem-types.ts` — All ~22 problem type definitions with domain, detection logic references, severity defaults
- `seo-task-templates.ts` — 16 template definitions (mirrors DB seed but used for client-side rendering and validation)
- `seo-priority-model.ts` — Weighted scoring formula: `severity * 0.25 + opportunity * 0.25 + business_value * 0.20 + ease * 0.15 + freshness * 0.10 - fatigue_penalty * 0.05`
- `seo-assignment-rules.ts` — Deterministic role-routing per task type with fallback chains
- `seo-state-machine.ts` — Valid transitions, escalation rules, suppression rules
- `seo-health-domains.ts` — 6 domain definitions with metric compositions
- `seo-quotas.ts` — Weekly/monthly quotas per object type (review requests, GBP posts, photo freshness, stylist contributions)

### Service Layer (`src/lib/seo-engine/`)

- `seo-task-service.ts` — CRUD, state transitions, validation (mirrors `operational-task-service.ts` pattern)
- `seo-priority-calculator.ts` — Pure function: inputs → 0–100 score
- `seo-assignment-resolver.ts` — Pure function: template + org context → user_id
- `seo-suppression-engine.ts` — Checks open duplicates, cooldowns, caps, missing data
- `seo-completion-validator.ts` — Per-template validation logic (system-verifiable vs proof-required)
- `seo-dependency-resolver.ts` — Checks hard/soft deps before allowing state transitions

### Hooks (`src/hooks/`)

- `useSEOTasks.ts` — Query/mutate seo_tasks with org scoping
- `useSEOHealthScores.ts` — Query seo_health_scores by object/domain
- `useSEOCampaigns.ts` — Query/mutate campaigns
- `useSEOTaskTemplates.ts` — Read templates
- `useSEOOpportunityRisk.ts` — Query opportunity/risk scores

### UI — SEO Workshop Tabs Replacement

Replace the 4 existing tabs (Overview, Actions, Guides, Tools) with:

1. **Dashboard** — Health scores by domain, top risks, top opportunities, campaign status, overdue count
2. **Tasks** — Role-filtered task list with status badges, priority scores, assignment, completion actions, proof upload
3. **Campaigns** — Active/planned campaign bundles with progress tracking
4. **Objects** — Browse SEO objects by type, see per-object health and attached tasks
5. **Settings** — Quota config, assignment overrides, suppression tuning

Keep Guides and Tools as sub-sections within the Dashboard or a Help tab.

---

## Phase 2: Detection Engine — Edge Functions for Scanning (Week 4–6)

### Edge Functions

**`seo-daily-scan/index.ts`** — Lightweight daily checks:
- Review velocity per location-service (from existing review/feedback data)
- GBP posting freshness (from stored GBP metadata)
- Photo freshness per service page
- Post-appointment review candidate identification
- Overdue task escalation
- Generates `seo_tasks` rows via deterministic template matching

**`seo-weekly-scan/index.ts`** — Deeper analysis:
- Page completeness/freshness audit (query website_sections data)
- Content gap detection
- Competitor gap analysis (if competitor data exists)
- Conversion weakness detection
- Service-location ranking movement

**`seo-monthly-scan/index.ts`** — Strategic:
- Quota tuning based on effectiveness history
- Task effectiveness analysis → update `seo_task_impact`
- Fatigue reset
- Campaign health evaluation

**`seo-score-calculator/index.ts`** — Computes health scores per object per domain, opportunity/risk scores per location-service.

All scans are scheduled via `pg_cron`. AI is invoked only for: generating natural-language task titles/explanations, drafting content, interpreting review text.

---

## Phase 3: Completion Validation, Impact Measurement, and Integration Points (Week 7–9)

- Hard completion validation logic per template type
- Proof artifact upload flow (storage bucket `seo-proof-artifacts`)
- Post-completion impact measurement (7d/30d/90d delta tracking)
- Contribution-confidence model
- Integration into Zura Insights (top SEO risks/opportunities cards)
- Integration into Zura Tasks (SEO tasks in unified task view)
- Integration into Website Builder (Page Health badge + guided fix tasks)
- Integration into Zura Marketer (pending content tasks + AI draft flows)

---

## Phase 4: New Location Bootstrap, Campaign Bundles, and Advanced Features (Week 10–12)

- New Location Bootstrap mode — auto-generates foundational SEO campaign
- Competitor gap campaign bundle generation
- Review-capture logic tied to appointment completion
- Historical effectiveness tuning of priority weights
- Full campaign lifecycle management
- Dashboard analytics: task velocity, completion rates, SEO score trends

---

## Technical Notes

- **Existing infrastructure reused**: `operational_tasks` pattern (state machine, history, escalation), Health Engine scoring pattern, edge function scheduling pattern, `_shared/` utilities
- **No AI in deterministic paths**: Task existence, assignment, priority, completion, suppression — all rule-based. AI only generates text content.
- **RLS**: All new tables get `organization_id` with `is_org_member`/`is_org_admin` policies
- **Tenant isolation**: All queries scoped via `effectiveOrganization`
- **State machine**: Strict enum-based transitions with audit trail on every change

---

## Recommendation

**Start with Phase 1.** It delivers the data model, config layer, service layer, hooks, and a functional UI inside the SEO Workshop. Phases 2–4 layer on automated detection, validation, and integrations incrementally. Each phase is independently useful.

Shall I proceed with Phase 1?

