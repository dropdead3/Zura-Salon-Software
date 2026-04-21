

# Wave 13G.E — Inert-surface cleanup

The wizard's structural and contract work is complete (13F + 13G.A/B/C/D/F). Five P2 cleanups remain — small, scattered, but each one is the difference between a wizard that *looks* finished and one that *feels* finished. Doing them as a single batch keeps the surface honest.

---

## What changes

### 1. `InitialSetupGateBanner` — soften for migrated cohort
Today: any org without `setup_completed_at` sees the same "Finish your operator profile" nudge — including migrated orgs whose draft is already populated by backfill.

Change: when `signup_source = 'backfilled'` AND a draft exists with at least one step carrying `backfilled === true`, swap copy to:
> **Review what we inferred** — We pre-filled your structure from existing data. Confirm or adjust the few open items.

CTA reads "Review and confirm" and routes to the wizard's summary phase (`/onboarding/setup?org=…&skipIntro=1` then jumps to summary if all required steps are populated). Greenfield orgs continue to see the existing copy.

Visibility contract preserved: still null when leadership/dismissed/completed.

### 2. `OperatorProfileSentence` — silent until populated
Today: renders "your business, a 1-location, team, to-be-defined compensation operation" even when Steps 1–4 are untouched. Reads as an indictment on the summary screen.

Change: render the full sentence only when Steps 1, 2, 3, and 4 are all populated (`__touched === true` OR `backfilled === true`, ignoring `__skipped__`). Otherwise render a single muted line:
> *Your operator profile will appear here once you complete the structural steps.*

Honors silence-as-valid-output.

### 3. `WhyWeAskCallout` — surface app-activation consequences
Today: generic "why we're asking" text. Step 5 implicitly activates Color Bar; the operator never sees that linkage.

Change: extend the callout to optionally accept an `activates?: string` prop. When set, append a third line below `unlocks`:
> **Activates: Zura Color Bar** *(installs automatically when you select chemical or color services)*

Wire this in `OrganizationSetup.tsx`'s WHY_WE_ASK by promoting it from a string to an object `{ reason, unlocks?, activates? }` for the two steps that actually trigger app activation:
- `step_5_catalog` → activates Zura Color Bar (chemical/color)
- `step_3_team` → activates Zura Payroll (when commission models are present in 4)

Other steps unchanged. Brand strings tokenized.

### 4. `org_setup_step_completion` — wire the consumer
Today: orchestrator upserts every commit; nothing reads the table.

Change: add a new hook `useOrgSetupStepCompletion(orgId)` that returns `{ stepKey: { completed_at, attempt_count } }`. `SetupProgressPanel` (`side` variant only) shows a tiny relative timestamp under each completed step's title (e.g. "Confirmed 3d ago"). On a fresh wizard the timestamps simply don't exist yet — visibility-contract clean. No noisy retry-count display unless `attempt_count > 1`, in which case append " · 2 retries" in muted text.

This converts a write-only side effect into actual operator feedback. Keeps the existing write path; no orchestrator change.

### 5. `UnfinishedFromSetupCallout` — token migration
Cosmetic. Replace ad-hoc `bg-card`, `bg-muted/20`, `border-border/60`, and inline padding with the canonical `tokens.card.*` and `tokens.layout.cardPadding` per design-token canon. No behavior change.

---

## Files affected

**Frontend**
- `src/components/onboarding/setup/InitialSetupGateBanner.tsx` — branched copy + CTA for migrated cohort
- `src/components/onboarding/setup/OperatorProfileSentence.tsx` — populated-gate, placeholder copy
- `src/components/onboarding/setup/WhyWeAskCallout.tsx` — `activates` prop + render
- `src/pages/onboarding/OrganizationSetup.tsx` — promote WHY_WE_ASK shape; pass `activates` through
- `src/components/onboarding/setup/SetupProgressPanel.tsx` — render `last_completed_at` line under completed steps
- `src/components/onboarding/setup/StepShell.tsx` — pass through new WHY_WE_ASK fields if needed (read-only check first)
- `src/components/onboarding/setup/UnfinishedFromSetupCallout.tsx` — token migration

**Hook (new)**
- `src/hooks/onboarding/useOrgSetupStepCompletion.ts` — read `org_setup_step_completion` for an org

**Memory**
- `mem://features/onboarding/wizard-orchestrator-contract.md` — append "Visibility surfaces" notes (gate banner branches, sentence gate, completion timestamps)

No DB migrations. No edge-function changes. No new RLS policies (existing org-scoped policies on `org_setup_step_completion` already cover read).

## Acceptance

1. A migrated org with `signup_source='backfilled'` and a backfilled draft sees the "Review what we inferred" banner copy, not the generic nudge.
2. A user lands on the summary with only Step 1 touched: `OperatorProfileSentence` shows the placeholder line, not the broken sentence.
3. Step 5 (Catalog) shows "Activates: Zura Color Bar" inside the "Why we're asking" disclosure.
4. After completing Step 1 once and returning, `SetupProgressPanel` (side variant) shows "Confirmed Xm ago" under the step. After two retries, " · 2 retries" appears.
5. `UnfinishedFromSetupCallout` renders identically but uses canonical tokens (verify by inspecting one settings page that surfaces it).
6. No new console warnings, no extra round-trips beyond the one new completion query (cached 60s).

## Doctrine compliance

- **Visibility contracts**: every new surface returns null/placeholder when its precondition is unmet (no completion data → no timestamp; no populated steps → placeholder sentence).
- **Brand abstraction**: app-activation copy uses `{{PLATFORM_NAME}}` token chain, not hardcoded "Zura."
- **Anti-noop**: `org_setup_step_completion` writes finally have a consumer.
- **Alert governance**: zero new alert paths.
- **Autonomy**: migrated orgs get reviewer framing, not coercive "finish your setup" copy.

