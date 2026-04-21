

# Wave 13G — Org Setup Wizard Audit (post-13F)

The wizard, draft, orchestrator, backfill, gate banner, persona scoring, and Step Health card are all wired end-to-end. With the field contract repaired in 13F.A, key-based resume in 13F.B, and Step Health surfacing in 13F.E, the structural P0 traps from prior audits are closed.

What remains is a **second tier of correctness gaps and inert surfaces** — places where the wizard *appears* to capture something but doesn't fully honor it downstream, plus a few "shipped but not consumed" pieces. None of these silently no-op the wizard, but each one quietly degrades the operator's first 30 days.

Below is the audit, then a proposed implementation wave.

---

## Findings

### P1 — Contract precision

1. **`step_3_team` drops `total_team_count` and `unmodeled_structure`.**
   The component captures both, the orchestrator ignores both. `total_team_count` is the only actual headcount we collect — without it, the team-size band is a guess and we can't seed payroll capacity, scheduling templates, or onboarding-task volume. `unmodeled_structure` is product feedback evaporating into the draft blob.

2. **`step_5_catalog` drops `unmodeled_categories`.**
   Same shape: collected by the component, never read by the orchestrator. This is the operator telling us a service category we don't model — silently dropping it means we never learn from it and the operator never gets a follow-up.

3. **`step_4_compensation` drops `unmodeled_description`.**
   Same problem. Worse: the Step component requires ≥10 chars in this field if `__escape__` is selected (treats it as a hard validator), then the orchestrator never persists it. The operator did real work; we threw it away.

4. **`step_1_identity` always defaults `business_type=single_location`** even if the user picked nothing. Combined with an early skip, we'll write `single_location` over a `multi_location` org that backfilled correctly. Should only update `business_type` when the user actually changed it.

5. **Step 7.5 Tier-1 "lock" is UI-only.** The `toggle()` early-returns for tier_1, but `installed` state is initialized from `apps.filter(tier !== "tier_3")`. If the classifier changes between sessions (e.g. user edits Step 5 to drop chemical), a previously-Tier-1 app remains pre-selected via stale `initialData.installed_apps`. Result: orgs activate apps they no longer qualify for.

### P1 — Re-entry semantics

6. **Single-step re-entry from settings calls `save` only.** `UnfinishedFromSetupCallout` deep-links into the wizard with `?step=...`, the user fills it in, and we persist to `org_setup_drafts` — but never re-invoke `commit-org-setup` for that step. So the underlying DB columns (`policy_org_profile.*`, `organizations.*`) never get the new value. The "Unfinished from setup" pill clears because the draft updated, but the data is still stale.

7. **`SetupSummary.canCommit` requires all `required` steps populated, but `step_1_identity` is the only one whose component validity actually requires real input.** Step 2 onwards default to populated state on mount via `useEffect → onChange`. Result: a user can blow through Steps 2–6 with default values and the summary will let them commit because every step has *some* draft payload. Validation needs to distinguish "user touched it" from "default fired on mount."

### P2 — Inert / stale surfaces

8. **`InitialSetupGateBanner`** renders for any org without `setup_completed_at`, including orgs whose `signup_source = 'migrated'` and who already have a backfilled draft. We should suppress it when a backfill has populated meaningful structural data even if the wizard wasn't formally completed (or push them through a one-click "confirm what we inferred" flow instead of the full wizard).

9. **`OperatorProfileSentence`** falls back to "your business" when `business_name` is empty — fine, but it also renders "your business, a 1-location, team, to-be-defined compensation operation" if the user hasn't reached Step 4. On the summary screen, this reads as an indictment of an incomplete setup. Should only render once Steps 1–4 are populated; otherwise show a one-line "We'll generate your operator profile once you finish the structural steps."

10. **`STEP_UNLOCK_CONSEQUENCES`** in `types.ts` references `step_5_catalog` as "Color Bar eligibility" but Step 5 has no UI hint that toggling chemical/color services activates Color Bar. The `WhyWeAskCallout` shows a generic line. Steps that drive automatic app activation should say so plainly in the "why we're asking" line.

### P2 — Telemetry & observability

11. **`org_setup_step_completion`** is upserted on every commit but is read by nothing in the codebase. Either consume it (per-step retry counts, time-since-completion for lifecycle outreach) or stop writing it to keep the surface area honest.

12. **Backfill never writes to `org_setup_step_events`,** so `org_setup_funnel_health` undercounts viewers for the migrated cohort. The Step Health card permanently reads "Insufficient sample" for those orgs even though they've been through the system. Backfill should emit synthetic `viewed`+`completed` events tagged `metadata.source = 'backfill'` so the funnel reflects reality.

### P2 — Doctrine compliance

13. **`UnfinishedFromSetupCallout`** uses raw `bg-card`, `bg-muted/20`, and ad-hoc spacing. Should be migrated to `tokens.card.*` per design-token canon, but it's readable as-is.

14. **Step 7.5 has no off-ramp** for Tier-1 apps when the operator genuinely doesn't want one (e.g. a salon offering color but using a different chemical-tracking tool). Per autonomy doctrine ("recommend, don't force"), Tier-1 should be hard-default, not hard-locked.

---

## Proposed Wave 13G — sub-wave breakdown

### 13G.A — Contract precision (3 handlers + 1 schema)

- **Migration:** add `policy_org_profile.total_team_count INT`, `policy_org_profile.unmodeled_structure TEXT`, `policy_org_profile.unmodeled_categories TEXT`, `policy_org_profile.unmodeled_compensation TEXT`. All nullable.
- **Orchestrator:** persist those fields in their respective handlers. Step 1 only writes `business_type` when caller actually set it (introduce a "touched" sentinel or compare against current org row).
- **Step 7.5 classifier idempotency:** when the wizard re-mounts with stale `initialData.installed_apps`, intersect with the current `apps` classifier output before persisting. Drop keys the operator no longer qualifies for.
- **Update** `mem://features/onboarding/wizard-orchestrator-contract.md` with the new fields.

### 13G.B — Re-entry actually commits

- When `singleStepKey` is set and the user clicks Next, `OrganizationSetup.persist(1)` should:
  1. Save the draft (already does).
  2. Invoke `commit-org-setup` with a new `single_step` flag so the orchestrator runs only that step's handler.
  3. Show a small confirmation toast and bounce back to `returnTo`.
- Orchestrator: accept optional `step_keys: string[]` body param; when present, iterate only those keys (skip the rest as `skipped: caller-scoped`).

### 13G.C — Validity needs "touched"

- Add `touched: boolean` to each step's onChange shape (or track per-step in `OrganizationSetup`). `SetupSummary.isPopulated` only counts as populated if the user actually interacted, not just if the mount-effect fired.
- For backfilled steps (`step_data[key].backfilled === true`), keep them "populated" so the existing legacy-org flow doesn't regress.

### 13G.D — Backfill emits funnel events

- `backfill-org-setup` edge function: after each successful step backfill, insert one `viewed` + one `completed` row into `org_setup_step_events` with `metadata: { source: 'backfill' }`.
- `org_setup_funnel_health` view: keep as-is (it'll just see real viewer counts now). Update the hook's tooltip copy to call out that backfilled orgs are included.

### 13G.E — Inert-surface cleanup

- `InitialSetupGateBanner`: suppress when `signup_source = 'migrated'` AND a draft exists with backfilled flags, replacing it with a softer "Review what we inferred" banner that opens the summary directly.
- `OperatorProfileSentence`: render the full sentence only when Steps 1, 2, 3, 4 are all populated (ignoring `__skipped__`). Otherwise show the placeholder copy.
- `WhyWeAskCallout`: extend the registry's `unlocks` field to mention the literal app activations (e.g. Step 5 hint reads "Selecting color or chemical services automatically activates Zura Color Bar").
- Either delete `org_setup_step_completion` writes or wire one consumer (proposed: a `last_completed_at` timestamp on the per-step pip in `SetupProgressPanel`).

### 13G.F — Tier-1 dignity

- `Step7_5AppRecommendations`: replace tier_1 hard-lock with a "Recommended — required for [color services]. [Skip anyway]" affordance. Selecting Skip writes the key to `app_interest` with `status='declined'` instead of activating it. Aligns with autonomy doctrine.

---

## Files affected

**Backend / DB**
- `supabase/migrations/<new>_wizard_contract_precision.sql` (4 nullable columns on `policy_org_profile`)
- `supabase/functions/commit-org-setup/index.ts` (Steps 1, 3, 4, 5 handlers; new `step_keys` param; Step 7.5 intersection)
- `supabase/functions/backfill-org-setup/index.ts` (emit step events)

**Frontend**
- `src/pages/onboarding/OrganizationSetup.tsx` (single-step commit on Next; `touched` tracking)
- `src/components/onboarding/setup/SetupSummary.tsx` (populated = touched, not just present)
- `src/components/onboarding/setup/Step7_5AppRecommendations.tsx` (decline affordance, classifier intersection)
- `src/components/onboarding/setup/Step1Identity.tsx` (mark `business_type` as touched only on user change)
- `src/components/onboarding/setup/OperatorProfileSentence.tsx` (placeholder when steps incomplete)
- `src/components/onboarding/setup/InitialSetupGateBanner.tsx` (migrated-cohort branch)
- `src/components/onboarding/setup/WhyWeAskCallout.tsx` (surface app activation consequences)

**Hooks**
- `src/hooks/onboarding/useCommitOrgSetup.ts` (optional `step_keys` arg)

**Memory**
- `mem://features/onboarding/wizard-orchestrator-contract.md` (new fields, single-step commit contract, touched semantics)

---

## Acceptance

1. Filling out Step 3 with `total_team_count = 12` and a custom structure description writes both to `policy_org_profile`.
2. A re-entry flow from `/dashboard/admin/team-hub` → `step_3_team` → Next → returns to TeamHub with both `org_setup_commit_log` (new row, `system='team', source='settings'`) and `policy_org_profile.team_size_band` updated.
3. A user who lands on the summary without touching Steps 2–6 sees `canCommit = false` and a clear list of "still needed" steps.
4. After a backfill on a migrated org, `org_setup_funnel_health` shows non-zero `viewed_count` for steps 0–6 with `unique_orgs_viewed >= 1`.
5. The Initial Setup Gate Banner does not appear for migrated orgs whose draft is fully backfilled; instead they see "Review what we inferred."
6. A Step 7.5 Tier-1 app can be declined; declining records the key in `app_interest` with `status='declined'` and never activates it in `organization_apps`.

## Doctrine compliance

- **Visibility contracts**: every new surface returns null when its precondition isn't met (touched, populated, materiality).
- **Autonomy**: Tier-1 lock removed in favor of "recommend + decline path."
- **Brand abstraction**: no new hardcoded strings; `{{PLATFORM_NAME}}` tokens preserved.
- **Alert governance**: zero new alert paths; this wave only sharpens existing surfaces.
- **Anti-noop**: every captured field now flows component → orchestrator → DB → consumer.

