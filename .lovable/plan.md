

# Org Setup Wizard — Full Build Audit (Wave 13)

A cross-layer review of the wizard, draft persistence, commit orchestrator, backfill, and re-entry surfaces. **The headline finding: the wizard is currently a no-op end-to-end** — three independent, ship-blocking bugs each guarantee that nothing the operator answers gets written to the database. The funnel and outreach machinery is sophisticated, but it's measuring an empty pipe.

---

## P0 — The wizard never persists answers

### B1. `commit-org-setup` queries the wrong column → draft never loads
File: `supabase/functions/commit-org-setup/index.ts` line 79.
```ts
.eq("user_id", user.id)
.eq("org_id", organization_id)   // ← column is `organization_id`, not `org_id`
```
DB confirmed: `org_setup_drafts` has `organization_id`, not `org_id`. Result: `draft` is always `null`, `stepData = {}`, every step is logged as `skipped: "no draft data"`. The UI cheerfully shows "Setup complete" because `failed === 0`.

**Fix**: rename to `organization_id`. Add an integration test that round-trips a draft through the orchestrator.

### B2. Draft step keys do not match the orchestrator's step keys
- Wizard saves under registry keys: `step_0_fit_check`, `step_1_identity`, `step_2_footprint`, …, `step_7_5_apps`.
- Commit handler iterates `STEP_ORDER = ['fit_check','identity','footprint','team','compensation','catalog','standards','intent','apps']`.
- `stepData['identity']` is always undefined even when the operator filled out Step 1.

Even if B1 were fixed, every step would still be reported as `skipped`. **Fix**: align `STEP_ORDER` to the registry keys (or build it dynamically from the registry rows the function already has access to).

### B3. `current_step` is TEXT in DB, but read/written as a number
- DB: `org_setup_drafts.current_step` is `text`.
- Hook (`useOrgSetupDraft.ts`) upserts `current_step: nextIndex` (a number — Postgres coerces silently to text like `"3"`).
- Resume logic (`OrganizationSetup.tsx` line 118): `if (typeof resumeAt === "number" && resumeAt >= 0 …)` — always false. Resume is broken; users always restart at step 0 even when they had progress.

**Fix**: change the column to `integer` (preferred) OR convert at the read boundary. Add `Number()` coercion in the resume effect.

---

## P1 — Field-shape mismatches across every step

For each step, the React component writes one shape, the commit handler reads another, and the DB has a third. Even if B1–B3 are fixed, the following data is silently lost:

| Step | Component writes | Commit handler reads | DB column actually exists |
|---|---|---|---|
| 2 Footprint | `{name, city, state}` per location | `loc.address`, `loc.postal_code` | `address`, `postal_code` exist but unwritten. **`location_count` & `operating_states` dropped.** No idempotency: re-commit duplicates locations. |
| 3 Team | `team_size_band`, `total_team_count`, `has_apprentices`, `has_booth_renters`, `has_assistants`, `has_front_desk`, `unmodeled_structure` | nothing — handler is a no-op | `policy_org_profile` has `team_size_band`, `has_booth_renters`, `roles_used` — all unwritten |
| 4 Compensation | `models[]`, `unmodeled_description` | `data.compensation_models_in_use` | column `compensation_models_in_use` exists; field name mismatch loses every selection |
| 5 Catalog | `service_categories`, `sells_retail`, `sells_packages`, `sells_memberships`, `serves_minors` | `offers_color_services`, `offers_extensions`, `sells_retail`, `offers_packages`, `offers_memberships`, `serves_minors` | `offers_color_services` does **not exist** — handler will throw 42703 once B1+B2 are fixed. Real columns: `offers_retail`, `offers_packages`, `offers_memberships`, `service_categories`, `serves_minors` |
| 6 Standards | `tip_distribution_rule`, `commission_basis`, `refund_clawback`, `has_existing_handbook` | `tip_handling`, `commission_basis`, `refund_clawback`, `has_existing_handbook` | `policy_org_profile` has `uses_tip_pooling` (bool), `commission_basis_in_use`, `uses_refund_clawback` (bool). Names AND types disagree. Also `refund_clawback` is now an enum (`always|rare|never`) being coerced to bool. |
| 7 Intent | `intent: string[]` | `data.intents` | `organizations.setup_intent` (text[]) — works once renamed |
| 7.5 Apps | `installed_apps[]`, `expressed_interest[]` | `tier3_interest` | only `app_interest` table; "installed" never reaches the apps marketplace |

**Fix**: introduce a single `STEP_PERSISTENCE_MAP` that pairs registry keys → handler functions, and write a contract test per step that round-trips the component's `onChange` payload through the handler against live DB columns. Treat the contract as the source of truth — handlers should never rename fields silently.

---

## P1 — Backfill writes a third, incompatible shape

`backfill-org-setup` writes draft step_data with yet another vocabulary:
- Step 3: `team_size`, `has_w2_staff`, `has_1099_contractors` (component expects `total_team_count`, `has_assistants`, `has_front_desk`).
- Step 4: `plan_types`, `primary_plan` (component expects `models`).
- Step 5: `categories`, `service_count` (component expects `service_categories`).
- Step 6: `accepts_tips`, `refund_policy: "case_by_case"` (component expects `tip_distribution_rule`, `refund_clawback`).

When a backfilled owner opens the wizard to "review and confirm," every step renders with **default values** because none of the inferred fields match `initialData?.<expected_key>`. The backfill effort is invisible to the operator.

**Fix**: backfill must write the same shape the React steps consume. Add a `backfilled: true` marker per step (already partially present) so the UI can surface "we pre-filled this" and the commit handler can set `source = 'backfill'` per step instead of overwriting.

---

## P1 — Routing & doctrine violations

### B4. `SetupCommitResult` uses `window.location.href` for deep links
`SetupCommitResult.tsx:89`:
```ts
onClick={() => (window.location.href = row.deep_link!)}
```
Direct violation of the routing core rule (the same bug we already fixed in `UnfinishedFromSetupCallout`). Hard reload, drops React Query cache, breaks slug-context multi-tenant URLs.

**Fix**: thread `useNavigate()` + `useOrgDashboardPath()` (or `dashPath()`) and dispatch via `navigate()`.

### B5. `commit-org-setup` stamps `setup_completed_at` even when zero steps committed
Lines 152–157 unconditionally set `setup_completed_at = now()`. Combined with B1+B2 this means: **today, every wizard run marks the org "complete" with zero data written**. This poisons the funnel (everyone is "completed"), poisons the followup queue (process-setup-followups will skip them), and poisons the backfill trigger (`useBackfillTrigger` only fires when `setup_completed_at IS NULL`).

**Fix**: only stamp `setup_completed_at` when `failed === 0 && completed > 0`. Otherwise leave it null and let the user re-enter from the dashboard.

### B6. `SetupSummary` exposes the commit button even when the wizard has empty steps
The summary screen iterates `completedSteps = steps.filter((s) => draftData[s.key])`. It renders the operator profile sentence with placeholders ("a 1-location, team, to-be-defined compensation operation in your business") even when nothing was filled. Combined with B5, the operator gets a confident "Your operating system is live" screen for an empty configuration.

**Fix**: gate the commit button on `completedSteps.length >= requiredCount`. Show "Finish required steps before committing" when not.

---

## P2 — Behavioral & UX gaps

### G1. `onChange` is fired inside the step's `useEffect`, then the wizard's `handleStepChange` mutates a ref — but the ref is only read inside `persist`. If the user types into Step 1 and clicks Next within the same React tick, `stepDataRef.current` may still be `{}` because the effect hasn't flushed. Result: occasional silent step drops on fast advancement.
**Fix**: snapshot the latest `onChange` payload synchronously inside Next handler, or move state into the parent.

### G2. `handleSkip` calls `persist(1)` which guards on `Object.keys(stepDataRef.current).length > 0` — for a soft-skip, current data is empty, so the skip telemetry fires but `current_step` is never advanced in the draft. Resume mid-skip always returns to the skipped step.

### G3. The wizard never shows the **fit_check** answer's downstream effect: `not_a_salon` gets a friendly callout but the user can still click Continue. There is no funnel "off-ramp completion" event nor admin notification. Folks who self-disqualify silently churn.

### G4. `STEP_UNLOCK_CONSEQUENCES` map (in `types.ts`) has a key `step_5_catalog: "Service catalog and Color Bar eligibility."` but no key for `step_0_fit_check` — the WhyWeAskCallout shows blank consequence text on step 0.

### G5. Re-entry from settings (`?step=step_X&returnTo=...`) triggers **only one step** to commit, but that path goes through `save.mutateAsync` which writes to draft, not to the canonical tables. So "edit just this step" updates the draft but never re-runs the handler — the org's actual data stays stale.
**Fix**: single-step re-entry should call a per-step commit endpoint (or `commit-org-setup` with a `steps_to_run` allowlist).

### G6. `OnboardingIntroScreen` shows a "Begin" button but no progress indicator of estimated time, no privacy reassurance, no "you can pause anytime" copy. First-impression abandonment is the funnel's largest weekly drop per the Wave 10 funnel data — but we don't measure where on the intro they bail.

### G7. `useOrgSetupDraft` writes `currentStep: params.currentStep ?? null` — passing `null` overwrites a previous valid `current_step`. If a user navigates back, persists, and then their browser crashes, resume is lost.

### G8. Conflict rules engine (`useConflictRules`) is loaded but never tied to a step's required action — `blockingConflict` is computed but the conflict rules table is empty in production (0 rows). Either seed real rules or hide the banners infrastructure.

### G9. `policy_org_profile.backfill_inferences` exists as a column but nothing writes to it. The backfill function should record `{step_5: {source: 'services_table', inferred_at: ...}}` for transparency and to power a "review your inferred answers" UI.

### G10. There is no idempotency on `commit-org-setup`. A double-click on the commit button (no debounce, no `useMutation` `mutationKey`) inserts duplicate rows in `org_setup_commit_log`, duplicates locations in `Step 2`, and duplicates `app_interest` rows.
**Fix**: pass `Idempotency-Key` (UUID generated client-side per commit attempt) and dedupe server-side.

---

## P2 — Observability & analytics

- **Step abandonment timing**: `step_events` records `viewed/completed/skipped` but not `time_on_step`. Without dwell time, we can't differentiate "got stuck" from "paused." Add `dwell_ms` on the `completed`/`skipped` event.
- **Validation failures**: when `onValidityChange(false)` fires, no telemetry is emitted. We can't distinguish "user thought about Step 4 for 8 minutes" from "user couldn't satisfy validation for 8 minutes." Emit a `validation_blocked` event with the failed field key.
- **Conflict resolution telemetry**: `acknowledged_conflicts` is logged at commit time, but there's no event for *seeing* a conflict, *jumping to fix*, or *ignoring*. The conflict engine's effectiveness is unmeasurable.
- **Backfill outcomes vs. wizard outcomes**: the funnel currently treats `source=backfill` and `source=wizard` orgs identically when computing completion. Once B5 is fixed, split the funnel surface so platform ops can see "true completion rate" separately from "backfill auto-complete rate."

---

## P2 — Architecture / governance

- **No structural enforcement gate**: per the doctrine, "structure precedes intelligence." Today the dashboard renders fully even when `setup_completed_at IS NULL`. Add an `EnforcementGateBanner` (`gate_initial_setup`) that nudges the operator into the wizard if intent + identity + compensation are missing. The wizard is currently optional in practice — that contradicts the North Star.
- **Persona scaling not wired**: `step_7_intent` writes to `organizations.setup_intent`, but no surface reads it yet. The "sidebar persona, recommendation engine prioritization, intelligence ordering" promised by the WHY_WE_ASK copy is unfulfilled. Either deliver the persona consumer or change the copy.
- **AI prohibition compliance**: the wizard correctly avoids AI for intent classification (good — doctrine). The `Step7_5AppRecommendations.classifyApps` rules engine is deterministic. Keep it that way; do not introduce LLM "smart suggestions" here.
- **`source: "backfill"` enum on commit log** is correct but not enforced upstream — `STEP_PERSISTENCE_MAP` should also write `source: "wizard"` automatically; today it's free-form.

---

## Recommended fix order

| Wave | Scope | Files |
|---|---|---|
| **13A** — Wire the wizard | B1 (org_id rename), B2 (step key alignment), B3 (current_step type), B4 (routing fix), B5 (gate setup_completed_at on success) | `commit-org-setup/index.ts`, `useOrgSetupDraft.ts`, `OrganizationSetup.tsx`, `SetupCommitResult.tsx`, migration for `current_step` |
| **13B** — Field shape contract | Per-step persistence map; rename `compensation_models_in_use`, `tip_handling→uses_tip_pooling`, etc.; idempotent footprint upsert; team commit handler implementation; intent rename | `commit-org-setup/index.ts`, all `Step*.tsx`, `backfill-org-setup/index.ts` |
| **13C** — Backfill alignment | Backfill writes the same shapes the components consume; populates `policy_org_profile.backfill_inferences`; surface "we pre-filled this" UI hint | `backfill-org-setup/index.ts`, all `Step*.tsx` |
| **13D** — UX & observability | G1 (sync state), G2 (skip persistence), G3 (off-ramp event), G6 (intro copy + dwell), validation + conflict telemetry, single-step re-entry handler, double-click dedupe, structural gate | `OrganizationSetup.tsx`, `OnboardingIntroScreen.tsx`, new `commit-step-X` endpoints, new `useEnforcementGates` consumer |
| **13E** — Persona consumer | Sidebar reads `setup_intent` and reorders surfaces; recommendation engine accepts the intent vector | sidebar config, recommendation engine |

---

## Technical notes
- Migration for B3 must convert existing `text` values: `ALTER TABLE org_setup_drafts ALTER COLUMN current_step TYPE integer USING NULLIF(current_step, '')::integer;`
- Renaming the column in B1 is the safest path (`org_id` doesn't exist). No data migration needed — there are 0 draft rows in production today.
- The `STEP_PERSISTENCE_MAP` should live in a shared module imported by both the orchestrator and a vitest contract suite that runs against a Postgres test DB (or at minimum, validates against the generated `types.ts`).
- After 13A, manually verify on the one existing `signup_source = 'migrated'` org: invoke `commit-org-setup` with a complete draft and confirm rows appear in `organizations`, `locations`, `policy_org_profile`, `app_interest`.
- Doctrine compliance to add to the build gate checklist for this surface: "every step's `onChange` payload shape is contract-tested against the orchestrator handler."

