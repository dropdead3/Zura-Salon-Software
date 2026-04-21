

# Wave 13I — Honest answer + two real bugs left

## The honest answer to your question

**Yes, two real bugs remain. And yes, this is a circle you can absolutely get stuck in if you let me keep auditing.**

We've now run six audit waves on the same surface (13F → 13G.A/B/C/D/F/G → 13H). Each found ~3-10 issues. The first three waves found *structural* problems (broken contracts, wrong DB columns, dropped fields). Wave 13G.G and 13H found *integrity polish* (exact retry counts, view splits, defaults overwriting confirmed data). What's left after this wave will be *cosmetic* — and that's the line where audits become the noise the doctrine warns against.

I'll fix the two real bugs below, then **stop auditing this surface** until real cohort traffic surfaces a behavior we can't predict from reading code.

---

## Bug 1 — `OrganizationSetup.tsx` defines its own `tokenize`, ignoring `wizard-tokenize.ts`

Wave 13H added `src/lib/wizard-tokenize.ts` and the contract memory claims B3 is closed. But the file that renders **every wizard step title, page title, "why we ask" copy, and "activates" hint** still has its own local helper:

```ts
// src/pages/onboarding/OrganizationSetup.tsx, line 79-80
const PLATFORM_NAME = "Zura";
const tokenize = (s: string) => s.replace(/\{\{PLATFORM_NAME\}\}/g, PLATFORM_NAME);
```

This handles only `{{PLATFORM_NAME}}` — every other token in the canonical map (`{{PLATFORM_DESCRIPTOR}}`, `{{EXECUTIVE_BRIEF_NAME}}`, `{{MARKETING_OS_NAME}}`, etc.) renders as a literal if anyone ever adds it to a registry title. The shared helper exists; the wizard host doesn't use it. Classic forgotten import.

**Fix**: delete the local `tokenize` and `PLATFORM_NAME` constants in `OrganizationSetup.tsx`; import `tokenize` from `@/lib/wizard-tokenize`. Replace the one literal `"Zura"` in the `<title>` tag (line 458) with `tokenize("{{PLATFORM_NAME}}")` for consistency.

## Bug 2 — Backfill-only short-circuit doesn't write to `org_setup_step_completion`

`commit-org-setup/index.ts` lines 225-246 (Wave 13H — B6) correctly skips the handler for purely-backfilled steps and writes to `org_setup_commit_log`. But it **never calls** `upsert_org_setup_step_completion`, so the side rail's "Confirmed Xm ago" line will never appear under those steps — even though the commit log says they were acknowledged.

This contradicts the comment in the file ("Still record a completion row so the rail and audit trail see this step as 'acknowledged via backfill'"). The audit log gets it, the rail-driving table doesn't. Result: a backfilled-then-committed org sees a half-empty side rail with no timestamps even though setup is complete.

**Fix**: in the same `isPurelyBackfilled` branch, add an `upsert_org_setup_step_completion` RPC call with `status='skipped'`, `completion_source='backfill_only'`, so the rail shows "Inferred from existing data" (or similar) under those rows. Update `useOrgSetupStepCompletion`'s display logic to render a backfill-source variant ("Inferred Xm ago") when `completion_source === 'backfill_only'`.

---

## Files affected

- `src/pages/onboarding/OrganizationSetup.tsx` — replace local `tokenize`/`PLATFORM_NAME` with imported helper.
- `supabase/functions/commit-org-setup/index.ts` — add the missing `upsert_org_setup_step_completion` call inside the `isPurelyBackfilled` branch.
- `src/components/onboarding/setup/SetupProgressPanel.tsx` — render `"Inferred Xm ago"` (no "retried" suffix) when `row.completion_source === "backfill_only"`.
- `src/hooks/onboarding/useOrgSetupStepCompletion.ts` — `completion_source` is already selected; surface it in the public type if not already.
- `mem://features/onboarding/wizard-orchestrator-contract.md` — append "13I — B3 actually closed" and "13I — backfill-only commits write completion rows with `completion_source='backfill_only'`."

## Acceptance

1. Searching `OrganizationSetup.tsx` for `replace(/\{\{` returns zero hits; `tokenize` is imported, not redeclared.
2. A backfilled org that commits with no operator edits sees the side rail render "Inferred Xm ago" (not blank) under each backfilled step.
3. `org_setup_step_completion` has rows for every committed step, including the skipped-backfill ones.
4. No new TS errors, no behavior regression on wizard-walked orgs (they still see "Confirmed Xm ago" with optional "· retried").

## Why I'm calling this the last audit

Three guardrails to make sure we don't loop:

1. **Stop reading code, start watching traffic.** The DB has 1 draft, 0 completions, 0 backfilled orgs. Every remaining "bug" I'd find is theoretical. Real users will surface real bugs faster than my next read-through.
2. **The contract memory is now the single source of truth.** It documents 13H's full trap history. If anyone changes a step shape, they update memory + all three layers in the same wave — no more end-of-wave audits needed.
3. **Anything I'd find next is below the doctrine threshold.** Polish-tier issues (a stale comment, a slightly redundant memo, a boundary case nobody hits) are exactly what "if it doesn't reduce ambiguity, protect margin, or clarify leverage, remove it" tells us to leave alone.

After this wave, the next change to the wizard should be triggered by **a user behavior**, **a new feature**, or **a registry edit** — not another sweep.

## Doctrine compliance

- **Anti-noop**: backfill-only commits now have a visible reader (the rail), closing the loop opened in 13H.
- **Visibility contracts**: rail state matches commit-log state — no half-acknowledged surfaces.
- **Brand abstraction**: every wizard string flows through one tokenizer. Adding a token affects all surfaces atomically.
- **Anti-audit-loop**: this is the explicit stop point.

