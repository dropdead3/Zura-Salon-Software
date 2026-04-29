# Hybrid Capability-Layer Architecture for Zura AI

Goal: stop hand-coding one tool per action. Instead, define **capabilities** in a registry (DB + TypeScript), let the AI compose them through three generic primitives (`find_entity`, `propose_change`, `execute_change`), and require a **human approval card** before any mutation runs.

This replaces the brittle "add another tool every time" loop and gives us governance, audit, and per-role guardrails for free.

---

## Core principles (non-negotiable)

1. **No autonomous mutations.** Every state-changing capability resolves to an `AIAction` card the operator must explicitly Approve. Read-only capabilities (lookups, summaries) execute immediately.
2. **Capabilities are data, not code.** Adding a new action = inserting a registry row + writing a small handler. The model never gets new tools to learn.
3. **Permission-aware.** A capability only appears to the model if the *current user* has the permission it declares. Reuses `usePermission` / `has_role` / `is_org_admin`.
4. **Tenant-scoped by construction.** Every capability handler receives `organization_id` from the verified session — model-supplied org IDs are ignored.
5. **Fully audited.** Every proposal, approval, denial, and execution writes to `ai_action_audit` with the full param diff.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ Zura Chat (AIChatPanel)                                     │
│   user msg ──▶ ai-agent-chat (edge fn)                      │
│                   │                                         │
│                   ├─ loads capability registry              │
│                   ├─ filters by user permissions            │
│                   └─ exposes 3 generic tools to LLM:        │
│                        find_entity / propose / execute      │
│                   ◀── tool_call: propose("deactivate_member"│
│                                          {memberId, reason})│
│   ◀── AIAction card (preview + diff + Approve/Cancel)       │
│                                                             │
│   user clicks Approve                                       │
│        │                                                    │
│        ▼                                                    │
│   execute-ai-action (edge fn)                               │
│        ├─ re-validates auth + permission                    │
│        ├─ looks up capability handler by id                 │
│        ├─ runs handler with verified org_id                 │
│        └─ writes ai_action_audit row                        │
└─────────────────────────────────────────────────────────────┘
```

---

## What gets built

### 1. Capability registry (DB)

New table `ai_capabilities` (RLS: read = `is_org_member`, write = platform-only):

| column | purpose |
|---|---|
| `id` (text, pk) | e.g. `team.deactivate_member` |
| `category` | `team`, `appointments`, `clients`, `inventory`… |
| `display_name`, `description` | shown to the LLM and on the approval card |
| `mutation` (bool) | `true` ⇒ requires approval |
| `required_permission` (text, nullable) | maps to `permissions.name` |
| `required_role` (app_role[], nullable) | optional role gate |
| `param_schema` (jsonb) | JSON Schema the model must satisfy |
| `preview_template` (text) | Handlebars-style summary for the approval card |
| `risk_level` (`low`/`med`/`high`) | drives confirmation copy + audit retention |
| `enabled` (bool) | kill switch per capability |

A small TS mirror in `src/lib/ai/capabilities/` registers handlers by id (`registerCapability(id, handler)`). The DB row is the contract; the TS handler is the implementation.

### 2. Three generic edge-function tools

Inside `ai-agent-chat`:

- `find_entity({ entity_type, query })` — read-only resolver (members, clients, appointments, services). Executes immediately. Returns canonical IDs + display fields.
- `propose_capability({ capability_id, params })` — for any `mutation: true` capability. Returns an `AIAction` of status `pending_confirmation`; **never executes**.
- `execute_capability({ capability_id, params })` — for `mutation: false` capabilities only. Executes immediately. Server enforces this — a model that calls `execute_capability` on a mutation gets rejected and forced into `propose_capability`.

The system prompt is reduced to one paragraph: "Use `find_entity` to resolve names. Use `propose_capability` for anything that changes data. Never write prose instructions for tasks the registry can perform."

### 3. Approval card upgrade (`AIActionPreview.tsx`)

Renders capability metadata from the registry, not hard-coded copy:
- Title from `display_name`
- Body from `preview_template` rendered with the proposed `params`
- Risk badge (`low` / `med` / `high`) drives button color and a typed-confirmation step for `high` (e.g. type the member's first name).
- Shows a "Why this action?" disclosure with the model's reasoning string.
- Approve → calls `execute-ai-action` with `{ capability_id, params, action_id }`.
- Cancel → marks the action `denied` in the audit table.

### 4. `execute-ai-action` becomes a dispatcher

Replaces the current `switch (actionType)` block with:
1. Validate JWT + org membership (existing).
2. Load capability row by `capability_id`; reject if `enabled = false`.
3. Re-check `required_permission` / `required_role` against the **calling user**, not the AI session.
4. Re-validate `params` against `param_schema`.
5. Look up the registered TS handler and run it with `{ supabaseAdmin, orgId, userId, params }`.
6. Insert into `ai_action_audit` (status `executed` or `failed`, with diff and result).

### 5. Audit & governance

New table `ai_action_audit`:
`id, organization_id, user_id, capability_id, params jsonb, status (proposed|approved|denied|executed|failed), reasoning text, result jsonb, created_at, executed_at`.

Surfaces a future "AI Decision History" page (out of scope for this build, but the data starts collecting now).

### 6. Seed capabilities (pilot scope)

Three handlers wired end-to-end so the pattern proves out across tiers:

- **Tier 1 (read):** `team.find_member`, `appointments.find_today`
- **Tier 2 (low-risk mutation):** `appointments.reschedule`, `appointments.cancel`
- **Tier 3 (high-risk mutation):** `team.deactivate_member`, `team.reactivate_member`

Existing logic in `execute-ai-action` is migrated into handlers — no behavioral change, just relocation.

---

## Files touched

**New**
- `supabase/migrations/<ts>_ai_capabilities.sql` — `ai_capabilities` + `ai_action_audit` tables, RLS, seed rows
- `src/lib/ai/capabilities/registry.ts` — `registerCapability`, `getCapability`, type definitions
- `src/lib/ai/capabilities/handlers/team.ts` — deactivate/reactivate/find member
- `src/lib/ai/capabilities/handlers/appointments.ts` — reschedule/cancel/find
- `src/lib/ai/capabilities/index.ts` — imports all handler files (registers on load)
- `supabase/functions/_shared/capability-loader.ts` — fetches enabled capabilities + permission filter
- `supabase/functions/_shared/capability-handlers.ts` — Deno-side mirror of handler dispatch (handlers live here for the edge runtime)

**Modified**
- `supabase/functions/ai-agent-chat/index.ts` — replace bespoke HR tools with the three generic tools; new system prompt
- `supabase/functions/execute-ai-action/index.ts` — convert to capability dispatcher
- `src/hooks/team-chat/useAIAgentChat.ts` — pass `capability_id` instead of `actionType`; surface `risk_level`
- `src/components/team-chat/AIActionPreview.tsx` — render from registry metadata, add typed confirmation for `high` risk

---

## Approval flow — the guarantee

For any capability where `mutation = true`:

1. Model **must** call `propose_capability`. The server rejects `execute_capability` for mutations with a 400 and a corrective message back to the model.
2. The chat returns an `AIAction` with status `pending_confirmation`. **No write has occurred.**
3. UI renders the approval card. Approve and Cancel are the only paths forward.
4. `execute-ai-action` re-verifies the caller's permission **at click time** (so a revoked role between proposal and click is honored).
5. High-risk capabilities require typing a confirmation token (member first name, "DEACTIVATE", etc.) before Approve enables.

There is no code path where a mutation runs without a human click. This is enforced server-side, not just in UI.

---

## What this replaces

- The growing `switch (actionType)` in `execute-ai-action` and the parallel `tools` array in `ai-agent-chat`.
- The "add a new tool, redeploy, retune the prompt" loop. Adding a capability is now: insert row + write handler.
- Ad-hoc permission checks scattered across handlers — now declared in the registry and enforced once.

---

## Out of scope (future phases)

- AI Decision History page (data collection starts now; UI later).
- Capability marketplace / per-org enable/disable UI.
- Multi-step capability chaining (`reschedule then notify`).
- Simulation preview ("what happens if I approve") — fits naturally once the registry exists.

---

## Acceptance checks

- "Deactivate Chelsea" → `find_entity` resolves her, `propose_capability("team.deactivate_member")` returns an approval card; nothing changes in the DB until Approve is clicked; `ai_action_audit` shows `proposed` then `executed`.
- A receptionist asks the same → capability is filtered out of the model's tool list; AI replies that it doesn't have permission.
- Model tries `execute_capability("team.deactivate_member", …)` → server returns a 400 forcing it to `propose_capability` instead.
- Cancel on the card → audit row flips to `denied`, no DB change.
