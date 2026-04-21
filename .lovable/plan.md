

# Wave 13H — Org Setup Wizard P2 audit (post-13G.G)

The structural rebuilds are done: contract repaired (13F.A), key-based resume (13F.B), Step Health surfacing (13F.E), backfill funnel events (13G.D), inert-surface cleanup (13G.E), reviewer fast-track + exact retry tracking (13G.G). The wizard is correctness-stable. What remains is a band of **second-tier integrity gaps and small UX bugs** that are visible in the code but invisible in production today because traffic is near zero (1 draft, 0 completions, 0 backfilled orgs in the DB).

This wave fixes them before real cohort data starts arriving and they harden into sediment.

---

## Findings

### B1 — `reviewMode` populated-check counts skipped steps (low)

`OrganizationSetup.tsx` (lines 164–186) uses `isPopulated` to decide whether to fast-track to summary, but its check `obj.__skipped__ === true → return false` is correct — yet `SetupSummary.canCommit` and the resume check disagree on what "complete" means in one edge case: a step that was *backfilled* (`backfilled: true`) but later *soft-skipped* (replaced with `{__skipped__: true}`). Today neither path strips the backfill marker on skip, so a reviewer could land on an empty-skipped step that still reads "populated" elsewhere. Fix: make `__skipped__` strictly dominant in both checks (already true in `isPopulated`, but `Step1Identity` etc. don't write `__skipped__` directly — only `persist({skipping:true})` does, in which case the `__touched` check is bypassed too). This is mostly already correct; document and add one defensive guard.

### B2 — Stale `qualified_keys` in draft survives Step 5 edits (medium)

`Step7_5AppRecommendations` recomputes `qualified_keys` from live `draftData` on mount and intersects on save (good — Wave 13G.A). But the **draft persists the old `qualified_keys` array** between visits. If a user (a) lands on Step 7.5 with `[zura_payroll, color_bar]`, (b) goes back to Step 5 and removes "color" services, (c) jumps directly to summary via the side rail without re-rendering Step 7.5 — the draft still has `installed_apps: ["color_bar"]` and the orchestrator sees stale `qualified_keys`. Fix: orchestrator should re-derive qualification from steps 3/4/5 inside the handler instead of trusting the client's `qualified_keys`. Defense in depth.

### B3 — `OperatorProfileSentence` displays `{{PLATFORM_NAME}}` literal in summary edit-buttons (low)

`SetupSummary.tsx` line 119 manually replaces `{{PLATFORM_NAME}}` only on the step title. Other surfaces (e.g. step descriptions, conflict copy if any) don't go through `tokenize()`. Centralize tokenization in a shared helper. Currently low-impact since registry titles don't use the token, but the contract is fragile — anyone adding a tokenized title later gets a literal render.

### B4 — `Step3Team` `total_team_count` band desync (low)

User picks band "11-25" but stepper still reads `5` (default). The two are independent state; `total_team_count` doesn't auto-jump when band changes. Funnel data downstream gets confused: `team_size_band='11-25'` AND `total_team_count=5`. Fix: when band changes, snap stepper into the band's midpoint unless user already touched the stepper. Track `countTouched` like `businessTypeTouched` in Step 1.

### B5 — Backfill writes `current_step: null` and clobbers prior resume (medium)

`backfill-org-setup` line 277 sets `current_step: null` on every run. If a user had been mid-wizard (`current_step=3, current_step_key='step_3_team'`) and the backfill subsequently runs (e.g. they switched browsers), their resume position is wiped. Today backfill normally runs *before* user input, but the ordering isn't guaranteed because `useBackfillTrigger` runs on dashboard mount independently. Fix: backfill should NOT touch `current_step`/`current_step_key` if the existing draft already has either set. Use a read-then-update pattern (already established memory).

### B6 — Backfill never sets `__touched`, but Step components read defaults on mount and write payloads without `__touched` on first onChange (medium)

When a backfilled user enters the wizard:
1. Step 1 mounts, reads `initialData` from backfill, immediately fires `onChange` with `__touched_business_type: false` (Step 1) — fine.
2. Step 3, Step 5, Step 6 components fire `onChange` with the rehydrated data but **no `__touched` flag**, only `backfilled: true` survives in the merge.
3. `persist(1)` then wraps with `__touched: touchedKeysRef.current.has(currentStep.key)` — which is **false** unless user advanced from this step before. So the merged payload becomes `{...rehydrated, __touched: false, backfilled: true}`.
4. `SetupSummary.isPopulated` returns true because `backfilled === true` short-circuits before `__touched` check. ✓

So summary works. But `OperatorProfileSentence.STRUCTURAL_KEYS` check also relies on `backfilled === true || __touched === true`. ✓

But the orchestrator's Step 1 handler (`commit-org-setup` line 358) writes `business_type` only if `__touched_business_type === true`. **Backfill sets `business_type: 'single_location'` always but never sets `__touched_business_type`**, so a backfilled multi-location org's draft is `business_type: single_location` and the handler correctly skips writing. ✓

But on commit, the orchestrator uses the draft's `business_type` for nothing else — handlers for Step 3/4/5 don't have a `__touched` short-circuit, so a backfilled draft will overwrite policy_org_profile fields with the backfill defaults (e.g. `serves_minors: false`, `tip_distribution_rule: individual`) even if the operator never confirmed them. Fix: every step that's purely-backfilled (`backfilled === true && __touched !== true`) should be **skipped during commit**, not re-applied. Record as `skipped: backfill-only, no user confirmation` so the commit log distinguishes confirmed-by-operator from inferred.

### B7 — Side rail "Confirmed Xm ago" can show before commit (low)

`useOrgSetupStepCompletion` reads from `org_setup_step_completion`. After 13G.G, every wizard step write goes through the upsert RPC. But scoped re-entry (`?step=…`) also writes a completion row — so if a user opens the wizard, single-edits Step 1, returns to settings, then later opens the full wizard, the rail shows "Confirmed 2m ago" under Step 1 but the **rest of the steps haven't been completed yet**. This is technically correct but visually implies progress that the new full-wizard run hasn't actually made. Fix: gate the timestamp display behind `completedKeys.has(step.key)` (the local in-flight set), not just the RPC row's existence. The rail should show timestamps only for steps the *current wizard session* considers complete.

### B8 — `backfilled_orgs = 0` despite the trigger being live (visibility, not bug)

Verified via DB: 0 orgs have `signup_source='backfilled'`. Either no eligible org has loaded the dashboard, or the trigger is silently failing in a way that doesn't surface. Add lightweight observability: write to `org_setup_backfill_attempts` with `outcome='ineligible'` reasons (no locations, already complete) so the platform admin can see *why* nothing's been backfilled, not just that nothing has. Today these branches return silently before the audit insert.

### B9 — `STEP_ORDER_FALLBACK` and `SYSTEM_BY_STEP` in orchestrator are hardcoded (low)

If a new step is added via registry, the orchestrator falls back gracefully (registry-driven loop), but `SYSTEM_BY_STEP` is hardcoded so any new step gets `system: <stepKey>` which won't match the `UnfinishedFromSetupCallout` filters. Add a `system` column to `setup_step_registry` and read it from there. Single source of truth.

### B10 — Funnel health view never recomputes `material` for backfilled orgs (low)

13G.D synthesized `step_events` for backfilled orgs (good), but those rows have `metadata.source='backfill'`, not a column. `org_setup_funnel_health` view aggregates by step_key without filtering by source, so backfilled cohorts inflate the `completed_count` and depress `drop_off_rate` for the wizard funnel. Add a separate `funnel_source` filter on the view (or a second view) so platform ops can split wizard-walked vs backfilled cohorts.

---

## Files affected

**Frontend**
- `src/components/onboarding/setup/Step3Team.tsx` — band → stepper auto-snap with `countTouched` ref (B4)
- `src/components/onboarding/setup/SetupProgressPanel.tsx` — gate timestamp row on `completedKeys.has(step.key)` (B7)
- `src/components/onboarding/setup/SetupSummary.tsx` — tokenize all step titles via shared helper (B3)
- `src/lib/wizard-tokenize.ts` — new tiny shared helper (B3)
- `src/pages/onboarding/OrganizationSetup.tsx` — defensive `__skipped__` guard in reviewMode populated-check (B1)

**Edge functions**
- `supabase/functions/backfill-org-setup/index.ts` — preserve existing `current_step`/`current_step_key`; insert `org_setup_backfill_attempts` rows for ineligible outcomes too (B5, B8)
- `supabase/functions/commit-org-setup/index.ts` — skip handlers for purely-backfilled-untouched steps with reason `backfill-only, no user confirmation`; re-derive Step 7.5 qualification server-side instead of trusting client `qualified_keys` (B2, B6)

**Database**
- New migration: add `system` text column to `setup_step_registry` populated from current `SYSTEM_BY_STEP`, then have orchestrator read it (B9)
- New migration: add a `funnel_source` filter to `org_setup_funnel_health` (or a sibling view `org_setup_funnel_health_wizard_only` excluding backfill-sourced events) (B10)

**Memory**
- `mem://features/onboarding/wizard-orchestrator-contract.md` — append "Backfilled-untouched steps are skipped during commit"; document the `system` column on `setup_step_registry`; document funnel-source split.

## Acceptance

1. A backfilled org with no operator edits commits with handler statuses showing `skipped: backfill-only, no user confirmation` for each unmoved step. Operator-touched steps still commit.
2. Editing Step 3 band from "1-3" to "11-25" auto-snaps the stepper to ~17 unless the operator already touched the stepper.
3. Side rail shows "Confirmed Xm ago" only on steps marked complete in the **current** wizard session, not stale completions from a prior single-step re-entry.
4. The backfill function writes a row to `org_setup_backfill_attempts` even when `outcome='ineligible'`, with the reason (`already_completed`, `no_locations`, `setup_pending_only`).
5. The commit-org-setup orchestrator's Step 7.5 handler ignores `qualified_keys` from the client and re-derives them from steps 3/4/5 in the draft.
6. Adding a new wizard step via registry no longer requires editing `SYSTEM_BY_STEP` in the orchestrator — handler reads `system` from the registry row.
7. Funnel health platform card shows two columns or a toggle: wizard-walked vs backfilled completion rates.
8. No new TypeScript errors, no new console warnings, no behavior regression on existing happy paths.

## Doctrine compliance

- **Anti-noop**: every captured field has a real reader; backfilled-untouched commits no longer silently overwrite user-confirmed defaults.
- **Visibility contracts**: rail timestamps tied to local session state; backfill audit rows show `ineligible` reasons instead of silent skips.
- **Autonomy**: backfill-only data isn't auto-confirmed at commit — explicit user touch required.
- **Brand abstraction**: tokenizer centralized; no scattered string replaces.
- **Alert governance**: zero new alert paths.
- **Container-aware**: no layout changes; existing breakpoints preserved.

