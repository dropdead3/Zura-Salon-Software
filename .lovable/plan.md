

# SEO Engine: Strategic Gap Assessment & Upgrade Plan

## Current State — What's Already Built

Your SEO engine has strong deterministic foundations:

- **Task templates** (16 types) with due dates, cooldowns, escalation thresholds
- **Campaign bundles** that group tasks by gap type (competitive, content, review, local)
- **Suppression engine** with duplicate, cooldown, cap, and data-quality checks
- **Impact tracker** with 7d/30d/90d measurement windows and contribution-confidence model
- **Effectiveness tracker** that tunes priority weights based on historical completion + impact data
- **Priority calculator** with weighted scoring model
- **Dependency resolver** for task sequencing
- **Completion validator** with proof artifacts and system verification
- **User task cap** (DEFAULT_USER_TASK_CAP = 10) as overload protection
- **Lever recommendation system** (lever_recommendations table + edge function + approve/decline/modify UX)

## Gap Assessment vs. Your 5 Critical Upgrades

### A. Task Compression → Campaign Execution: PARTIALLY BUILT

`seo-campaign-bundle.ts` generates campaign bundles that group tasks by gap type. `SEOEngineCampaigns.tsx` renders them. **But the UX still lists individual tasks** — there's no "Own Hair Extensions in Gilbert" campaign-first view that collapses 6 tasks into one goal with a progress ring. The campaign detail dialog exists but is a flat task list, not a goal-oriented execution view.

**Gap**: Campaign-first UX with goal framing, progress visualization, and collapsed task checklist.

### B. Revenue Attribution Layer: NOT BUILT

`ImpactMetrics` tracks deltas (review velocity, traffic, conversion) but **no revenue is attributed to SEO objects or campaigns**. There's no "$18,400 from this page" or "campaign expected to generate +$6,200/month." The POS data (appointments, transactions) exists in the platform but isn't connected to SEO objects.

**Gap**: Revenue-per-SEO-object calculation, campaign revenue attribution, and estimated ROI projection.

### C. Task Impact Feedback Loop: PARTIALLY BUILT

`seo-impact-tracker.ts` has the contribution-confidence model. `seo-effectiveness-tracker.ts` computes modifiers that tune priority weights. **But this isn't wired to any UI** — there's no post-completion message like "This increased extension reviews by 18%." The `seo_task_impact` table query exists in `useSEOTaskImpact` but it's not surfaced in the task completion flow or anywhere visible.

**Gap**: Post-completion impact summary in task detail, campaign results summary, and visible learning feedback.

### D. Overload Protection: MOSTLY BUILT

`DEFAULT_USER_TASK_CAP = 10` exists. Suppression engine enforces it. Cooldowns, max-per-object, and duplicate checks are all in place. **Missing**: per-location active campaign cap (1 campaign per location-service), and daily task cap (currently only total cap).

**Gap**: Daily task generation cap per user (3/day), active campaign cap per location-service (1).

### E. "Do It For Me" Layer: NOT BUILT

No auto-generation or auto-execution buttons exist. Tasks are manual. No "Generate + Apply FAQs" or "Generate + Post to GBP" capability.

**Gap**: AI-powered action buttons on eligible task types.

### F. SEO Momentum Score: NOT BUILT

Current `SEOInsightsCard` shows static health scores and opportunity/risk numbers. No forward-looking momentum metric combining task completion velocity + review velocity + content freshness + competitor movement. No "gaining/losing ground" framing.

**Gap**: Momentum score computation and directional UX ("gaining in Blonding, losing in Extensions").

---

## Recommended Build Sequence (Phase-Aligned)

Given your phase map (Phase 1 = structured visibility, Phase 2 = advisory), here's what to build and in what order:

### Phase 1A — Campaign-First UX (Upgrade A)
Restructure `SEOCampaignDetailDialog` and `SEOEngineDashboard` to lead with campaigns as goals, not task lists. Show: campaign title as a goal statement, progress ring (X/Y tasks done), collapsed task checklist, and campaign-level status.

### Phase 1B — Momentum Score (Upgrade F)
Add `seo-momentum-calculator.ts` that computes a directional score from: task completion velocity (7d rolling), review velocity delta, content freshness recency, and competitor distance changes. Surface in `SEOInsightsCard` and `SEOEngineDashboard` with "gaining/losing" directional language per service-location.

### Phase 1C — Impact Feedback in UI (Upgrade C)
Wire `useSEOTaskImpact` into `SEOTaskDetailDialog` post-completion view. Show "This task contributed to: +18% review velocity (high confidence)" after completion. Add campaign-level impact rollup in `SEOCampaignDetailDialog`.

### Phase 1D — Overload Refinement (Upgrade D)
Add `MAX_DAILY_TASKS_PER_USER = 3` and `MAX_ACTIVE_CAMPAIGNS_PER_LOCATION_SERVICE = 1` to `seo-quotas.ts`. Enforce in suppression engine and campaign creation logic.

### Phase 2A — Revenue Attribution (Upgrade B)
Connect POS appointment/transaction data to SEO objects via service-location mapping. Compute rolling 30d revenue per SEO object. Show in object detail and campaign cards. Add estimated ROI to campaign creation flow.

### Phase 2B — "Do It For Me" (Upgrade E)
Add AI-powered action buttons to eligible templates (FAQ generation, GBP post generation, review request automation). Each follows: Generate → Preview → Approve → Execute. Guardrailed by the autonomy model.

---

## Files to Create/Modify (Phase 1A-1D)

| File | Change |
|---|---|
| `src/lib/seo-engine/seo-momentum-calculator.ts` | New: Momentum score computation |
| `src/config/seo-engine/seo-quotas.ts` | Add daily cap + campaign-per-location cap |
| `src/lib/seo-engine/seo-suppression-engine.ts` | Enforce daily cap in suppression checks |
| `src/components/dashboard/seo-workshop/SEOCampaignDetailDialog.tsx` | Redesign as goal-oriented view with progress ring + impact rollup |
| `src/components/dashboard/seo-workshop/SEOEngineDashboard.tsx` | Add Momentum Score tile, campaign-first summary |
| `src/components/dashboard/seo-workshop/SEOInsightsCard.tsx` | Add momentum directional language |
| `src/components/dashboard/seo-workshop/SEOTaskDetailDialog.tsx` | Add post-completion impact summary |
| `src/lib/seo-engine/seo-campaign-bundle.ts` | Add location-service campaign cap validation |

This is a multi-session build. I recommend starting with **Phase 1A (Campaign-First UX)** and **Phase 1B (Momentum Score)** as the first implementation pass — these create the most visible strategic differentiation with the least backend dependency.

