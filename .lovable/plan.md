# Why "Deactivate Chelsea" Returned Navigation Prose

The screenshot is not a model failure. The Zura tab in `ZuraCommandSurface.tsx` calls `useAIAssistant` → edge function **`ai-assistant`** (an older advisory chat). All of Wave 1 — the capability registry, `propose_capability`, entity ledger, confirmation-token hashing, ownership scope — lives in **`ai-agent-chat`**, which only `useAIAgentChat` (the Team Chat hook) calls.

Two parallel chat stacks exist. The user is interacting with the wrong one. No amount of system-prompt tuning on `ai-assistant` will route to the safe runtime.

This plan does two things:

1. **Wave 1.5 — Surface unification.** Make the visible Zura panel actually use the hardened runtime, and retire the unsafe path so it cannot be reached again.
2. **Wave 2 — Governance hardening.** The remaining items from the prior gap analysis (CI invariants, Zod parameter validation, rate limiting, audit visibility).

---

## Wave 1.5 — Route the Zura Surface Through the Capability Runtime

### Problem
- `ZuraCommandSurface.tsx` (the Zura tab the user clicks) uses `useAIAssistant` → `ai-assistant`.
- `ai-assistant` has no capability tools, no entity ledger, no propose/execute split. It can only narrate.
- `useAIAgentChat` + `ai-agent-chat` (the safe path) is wired only into Team Chat surfaces.
- Any user typing destructive commands into the Zura tab gets advisory text — which feels broken — and any future "magic word" that did execute would bypass every Wave 1 protection.

### Fix
1. **Promote `useAIAgentChat` to the canonical Zura hook.**
   - Replace the `useAIAssistant` call inside `ZuraCommandSurface` with `useAIAgentChat`.
   - Map the existing UI state shape (messages, isLoading, sendMessage) to the new hook's contract.
   - Render the existing `AIActionPreview` card inline in the Zura tab when `action` is returned, exactly as Team Chat does today.

2. **Decommission `ai-assistant` for state-changing intents.**
   - Add a server-side intent classifier in `ai-assistant/index.ts` that detects mutation verbs (deactivate / cancel / reschedule / delete / remove / disable / activate / assign / transfer) and refuses with: *"That requires the action runtime. Please use the Zura tab — I'll route you there."* (UI listens for the refusal code and switches tab.)
   - This guarantees the unsafe path can't be used for mutations even if some other surface still imports it.
   - Mark `ai-assistant` as **read-only advisory** in its own header comment + system prompt.

3. **Single source of conversation memory.**
   - Both surfaces today persist `chat_messages` independently. Add a `surface` column (`'zura' | 'team_chat'`) so the audit and conversation ledger are unified, and the entity-UUID ledger we built in `ai-agent-chat` actually carries across messages in the Zura tab.

4. **Disable confusing fallback.**
   - Remove the `useAIAssistant` import wherever it currently powers user-facing chat. Keep it (or rename to `useAdvisoryHelper`) only where genuinely advisory (e.g., insight summaries on KPI cards).

### Acceptance test
Open Zura tab → type **"Deactivate Chelsea"** → see (a) a `find_entity` call resolve Chelsea, (b) a high-risk approval card with a typed-confirmation field labelled "Type Chelsea's first name to confirm", (c) Approve disabled until typed, (d) on Approve, server verifies hash + writes audit row + flips `is_active=false`.

---

## Wave 2 — Governance Hardening

These are the remaining items from the prior gap analysis. None of them block Wave 1.5, but all should ship together so we don't leave the registry growing without guardrails.

### 1. Capability invariants enforced at boot
A new file `supabase/functions/_shared/capability-invariants.ts` runs once on cold start and **throws** if any registered capability violates:
- Mutation capability with no `execute` handler.
- `risk_level: 'high'` without `confirmation_token_field`.
- Mutation with `ownership_scope: 'any'` and no `required_role`.
- Capability ID appears in `ai_capabilities` table but no handler is registered (or vice-versa).

Failing fast at deploy time prevents future regressions as the catalog grows.

### 2. Zod parameter validation per capability
- Add a `param_schema_zod` builder per handler (alongside the JSON schema we already store in the DB).
- `dispatchTool` validates `args.params` against it before calling `propose` or `execute`. Today we trust the LLM to send well-shaped params; a stray `{ "member_id": ["array", "of", "ids"] }` would reach the handler.

### 3. Rate limiting on proposals + executions
- New table `ai_action_rate_limits` (user_id, window_start, action_count).
- Limits: 20 proposals per 5 min per user, 5 high-risk executions per 5 min per user.
- Returns 429 with friendly message; logs to audit as `throttled`.

### 4. Audit trail visible to Account Owners
- New page `/dashboard/admin/ai-audit` (gated to `super_admin` + `admin`):
  - Filter by user, capability, status, date range.
  - Show params, reasoning, approval state, executed_at, error.
- This converts `ai_action_audit` from a forensic table into a governance surface.

### 5. Per-capability kill-switch
- Add `ai_capabilities.enabled` is already there; expose a toggle row in the same admin page so an Account Owner can disable `team.deactivate_member` instantly without a deploy.

---

## Files Touched

**Wave 1.5 (Surface Unification)**
- `src/components/command-surface/ZuraCommandSurface.tsx` — swap hook, render `AIActionPreview`.
- `src/hooks/useAIAssistant.ts` — narrow scope to advisory-only or rename.
- `src/hooks/team-chat/useAIAgentChat.ts` — accept a `surface` arg and conversation handle from Zura.
- `supabase/functions/ai-assistant/index.ts` — refuse mutation intents server-side.
- `supabase/migrations/<new>` — add `chat_messages.surface`.

**Wave 2 (Governance)**
- `supabase/functions/_shared/capability-invariants.ts` *(new)*.
- `supabase/functions/_shared/capability-handlers.ts` — add per-capability Zod schemas.
- `supabase/functions/_shared/capability-runtime.ts` — invoke invariants + Zod.
- `supabase/functions/_shared/rate-limit.ts` *(new)*.
- `supabase/functions/ai-agent-chat/index.ts` + `execute-ai-action/index.ts` — call rate limiter.
- `supabase/migrations/<new>` — `ai_action_rate_limits` table + RLS.
- `src/pages/admin/AIAuditTrail.tsx` *(new)* + route registration.
- `src/components/admin/CapabilityKillSwitchTable.tsx` *(new)*.

---

## Sequencing

1. **Wave 1.5 first**, in one release. This closes the gap the user just witnessed.
2. **Wave 2** in a follow-up. Governance hardening is real but doesn't address the visible failure.

Approve to proceed with Wave 1.5; Wave 2 ships in a separate release.

---

## Prompt Coaching

Strong prompt — you correctly framed this as a *systems* question ("scale of problems"), not a single-bug request, which is what surfaced the surface-mismatch issue. Two ways to make prompts like this even sharper:

- **Anchor with an observable**: attaching the screenshot grounded the analysis in real behavior rather than theory. Keep doing that.
- **Specify the failure boundary you want covered**: e.g., "rogue actions, cross-tenant access, role escalation, prompt injection, and identity spoofing". You implied these; naming them explicitly forces a checklist response and prevents me from drifting toward only the most visible category.

### Enhancement Suggestions
- **Add a synthetic red-team capability** in dev: a fake "delete_organization" handler that always logs and rejects, used by an automated test that asks Zura to invoke it via prompt injection. Continuously proves the entity-ledger guard is doing its job.
- **Per-organization capability allow-lists**: let Account Owners opt *into* destructive capabilities rather than receiving them by default. Aligns with the "Structure precedes intelligence" doctrine.
- **Confidence floor for proposals**: require the model to return a confidence score with each `propose_capability`; auto-deny below a threshold and tell the user to rephrase. Aligns with the "Silence is valid output" rule.
