

# Wave 13G.G — Make the cleanup actually visible & exact

13G.E shipped three good ideas (timestamps under steps, migrated reviewer copy, app-activation hints) but each one has a half-built edge:

1. The completion-timestamp surface only renders in `SetupProgressPanel` *side* variant — and **nothing in the wizard mounts the side variant**. We're reading the table for nobody.
2. `attempt_count` is inferred from `updated_at − created_at > 2s`. Approximate, can't tell 2 retries from 7, breaks for legitimate slow upserts.
3. "Review and confirm" CTA from `InitialSetupGateBanner` drops migrated operators back into Step 0 of an 8-step sequence even though their data is fully backfilled. Wrong door.

This wave fixes each one cleanly. No overlap, no scope creep.

---

## What changes

### 1. Mount the side rail at `lg` and above

`StepShell` becomes a two-column layout at `lg:` breakpoint:

```text
lg+:   [ side rail 240px ][ step body 3xl ]
< lg:  [ step body, inline pips at bottom (today's behavior) ]
```

- The side rail renders `<SetupProgressPanel variant="side" orgId={orgId} />` so the completion timestamps and "retried" hints (already wired) are finally visible.
- Inline pip strip stays for `< lg` — mobile/tablet keep the lean pips.
- Sticky positioning (`lg:sticky lg:top-6`) so the rail stays visible during long steps.
- Single-step re-entry (`?step=…`) renders body-only with no side rail (timestamps are noise when you're editing one field). Detected via existing `singleStepKey` already in scope.

Visibility contract preserved: no timestamps yet → rail still renders the step list, just without the "Confirmed Xm ago" lines (existing hook already handles empty data).

### 2. Make `attempt_count` exact

- **Migration**: add `attempt_count INT NOT NULL DEFAULT 1` to `public.org_setup_step_completion`.
- **Orchestrator**: change the upsert in `commit-org-setup/index.ts` (line 209-216) so on conflict it bumps `attempt_count = org_setup_step_completion.attempt_count + 1` via raw upsert with the explicit `ON CONFLICT DO UPDATE SET attempt_count = … + 1`. Since Supabase JS upsert can't increment, switch this single call to `supabase.rpc('upsert_step_completion', { … })` or to two queries (`select` then `update|insert`). Cheapest path: an RPC `upsert_org_setup_step_completion(org_id, step_key, status, data, completion_source, completed_version)` that does the `INSERT … ON CONFLICT … SET attempt_count = … + 1` server-side.
- **Hook**: `useOrgSetupStepCompletion` selects the new column directly. Drop the `created_at`/`updated_at` heuristic. Display rules unchanged — still suppress unless `> 1`.
- Backfill: existing rows default to `1`, which matches reality (one synthetic commit per backfilled step).

### 3. Auto-route migrated reviewers to summary

- `InitialSetupGateBanner.handleStart` for the migrated branch routes to `?org=…&skipIntro=1&reviewMode=1` (greenfield path unchanged).
- `OrganizationSetup`:
  - read `reviewMode = params.get("reviewMode") === "1"`
  - in the resume effect, if `reviewMode && draft && allRequiredStepsPopulated(draft)`, set `phase = "summary"` immediately and skip the step sequence.
  - if `reviewMode` but a required step is *not* populated (rare — backfill missed something), fall through to the normal first-incomplete-step resume (no dead-end).
- `SetupSummary` already handles "edit one step → jump back → return to summary" via `onEditStep`, so the reviewer can drill into any incomplete area without losing the summary anchor.

---

## Files affected

**Database**
- `supabase/migrations/<new>_step_completion_attempt_count.sql` — add column, create or replace `public.upsert_org_setup_step_completion(...)` RPC with `SECURITY DEFINER` and `is_org_admin` guard.

**Backend**
- `supabase/functions/commit-org-setup/index.ts` — replace the single upsert call (lines 209–218) with the new RPC. Behavior identical otherwise.

**Frontend**
- `src/components/onboarding/setup/StepShell.tsx` — `lg:` two-column grid; render `SetupProgressPanel variant="side"` in left column (suppressed when `singleStepKey` is set, which we'll pass down via existing `orgId`/new optional `singleStep?: boolean` prop).
- `src/pages/onboarding/OrganizationSetup.tsx` — pass `singleStep={!!singleStepKey}` to `StepShell`; read `reviewMode` flag; auto-jump to summary when applicable.
- `src/components/onboarding/setup/InitialSetupGateBanner.tsx` — append `&reviewMode=1` to the migrated CTA URL only.
- `src/hooks/onboarding/useOrgSetupStepCompletion.ts` — select `attempt_count` directly; drop the heuristic.

**Memory**
- `mem://features/onboarding/wizard-orchestrator-contract.md` — note the new column, RPC contract, and `reviewMode` query param.

## Acceptance

1. On a `≥lg` viewport, the wizard shows a sticky left rail listing all steps with completion timestamps. On mobile, the rail is hidden and inline pips render as today.
2. Single-step re-entry (`?step=…`) renders body-only on all viewports — no side rail.
3. After two genuine commits of Step 1, the side rail under Step 1 reads `Confirmed Xm ago · retried`. After a third commit, it stays `· retried` (display caps at >1; underlying count is exact in DB).
4. Migrated org clicks "Review and confirm" → lands on `SetupSummary` directly, never sees the step sequence unless they click "Edit" on a row.
5. Migrated org with one missing required step (incomplete backfill) clicks "Review and confirm" → lands on the first incomplete step, not the summary. No dead-end.
6. No new console warnings; no duplicate completion rows; `attempt_count` increments by exactly 1 per commit.

## Doctrine compliance

- **Visibility contracts**: side rail hides timestamps when no completion data; reviewer flow falls back to normal resume when data is incomplete.
- **Anti-noop**: `attempt_count` writes now have a real reader (the rail), and the rail is now actually mounted.
- **Autonomy**: reviewer flow respects "we'll show you what we inferred, not march you through 8 steps you don't need."
- **Container-aware**: `lg:` breakpoint follows existing dashboard responsive convention; no viewport-only assumptions about content.
- **Brand abstraction**: no new brand strings introduced.

