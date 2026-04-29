## Short answer

Yes — and the foundation already exists. `ai-agent-chat`, `detect-chat-action`, and `execute-ai-action` already implement the agent loop for **appointment actions** (reschedule, cancel, confirm, no-show). What you're describing — "Chelsea was just fired, deactivate her profile" — is the same loop extended to **HR actions**, with stricter governance because the blast radius is bigger.

But this is exactly the kind of decision your own doctrine constrains. Three Core memory rules pull on this directly:

1. **AI is prohibited from determining business eligibility, priorities, or auto-executing high-impact operations.** (Core)
2. **Recommend → Simulate → Request Approval → Execute (within guardrails)** is the canonical autonomy model. Promotions, terminations, and pay decisions are explicitly listed as **never autonomous**.
3. **Stylist Privacy Contract + Billing Access Control** restrict who can even see/affect staff records.

So the answer isn't "let the AI deactivate Chelsea." It's: **let the AI propose the deactivation, surface the consequences, and require an authorized human to one-click confirm.** That's what you actually want — speed without losing accountability.

## How the agent loop works today (verified)

```text
User: "Chelsea was just fired. Deactivate her."
        │
        ▼
ai-agent-chat (edge function)
  - Loads system prompt + tool definitions
  - Sends conversation + tools to Lovable AI Gateway
  - AI returns a tool_call: { name: "deactivate_team_member", args: {...} }
        │
        ▼
Frontend chat UI receives the tool_call
  - Renders an ActionConfirmationCard (NOT auto-execute)
  - Shows: "Deactivate Chelsea Martinez (Stylist, joined Mar 2023).
            This will: revoke login, unassign upcoming appointments,
            preserve historical data. Continue?"
  - [Confirm] [Cancel]
        │ user clicks Confirm
        ▼
execute-ai-action (edge function)
  - Re-validates auth + org membership
  - Checks caller has manage_team_members permission
  - Performs the mutation via service-role client
  - Writes an audit record
  - Returns success
        │
        ▼
Chat shows: "Done — Chelsea's profile is deactivated.
             3 future appointments need reassignment. [Open]"
```

Three of these four pieces already exist. We're adding HR tools to the catalog and a few new branches to the executor.

## What to build

### 1. Extend the tool catalog in `ai-agent-chat`

Add three HR tools to the existing `TOOLS` array:

- `find_team_member` — fuzzy-resolve a name like "Chelsea" to a `user_id`. Returns `{ user_id, full_name, role, location_ids, is_active, hire_date, upcoming_appointment_count }`. If multiple matches, returns the list and forces the AI to ask "Did you mean Chelsea Martinez or Chelsea Wong?"
- `deactivate_team_member` — proposed action only. Returns a structured proposal payload, never mutates.
- `reactivate_team_member` — symmetric.

The AI **does not call mutation endpoints directly**. It calls a `propose_*` tool that returns a structured "intent" object. The mutation only fires when the human confirms in the UI. This matches the existing `reschedule`/`cancel` pattern.

### 2. Extend `execute-ai-action`'s switch statement

Add three cases: `deactivate_team_member`, `reactivate_team_member`, `remove_team_member`.

Each case must:

- Verify caller has `manage_team_members` permission server-side (the `useUserPermissions` check on the client is not enough — RLS / explicit check in the edge function is the security boundary).
- Reject the action if the target user is the **Account Owner** (per Billing Access Control memory).
- Reject if target = caller (no self-deactivation).
- Run the same mutation that `SecurityTab.tsx` already uses (`toggleActive` / `removeUser` hooks). Don't duplicate logic — extract the mutation into a shared helper if it's currently inline in the hook.
- Write to an `ai_action_audit` table: `{ actor_user_id, target_user_id, action_type, source: 'ai_chat', ai_session_id, before_state, after_state, created_at, organization_id }`. This satisfies the audit/compliance posture in your doctrine.

### 3. ActionConfirmationCard component (chat UI)

A new component the chat renders inline whenever the AI emits a `propose_*` tool_call. It shows:

- The action ("Deactivate Chelsea Martinez")
- The structural impact ("3 upcoming appointments will need reassignment. Login access revoked. Historical data preserved.")
- Two buttons: **Confirm** (calls `execute-ai-action`) and **Cancel** (sends a "user cancelled" message back to the AI so it can acknowledge).
- Permission-aware: if the viewer lacks `manage_team_members`, render a read-only "This action requires an Account Owner to confirm" state instead of the buttons.

This is the equivalent of the `<EnforcementGateBanner>` pattern — guardrails are visible, not hidden.

### 4. Materiality gate on AI proposals

If the AI's confidence in matching "Chelsea" is below a threshold (e.g. multiple stylists named Chelsea, or fuzzy-matched from "Chels"), the AI **must** ask for disambiguation before proposing. This satisfies the "Lever and Confidence Doctrine" — silence is valid output, and acting on ambiguous input is the failure mode you don't want.

### 5. Scoped autonomy tiers (future-proofing)

Codify three tiers so this scales beyond Chelsea:

| Tier | Examples | Flow |
|---|---|---|
| **Read-only** | "Show me Chelsea's last 30 days" | AI executes directly, no confirmation |
| **Reversible mutation** | Deactivate user, reschedule appointment, send a reminder | Propose → Confirm → Execute (this plan) |
| **Forbidden / never autonomous** | Set commission %, fire someone for cause, change pay structure, delete data | AI surfaces the request and routes the user to the right page; never proposes execution |

The `app_role` enum and `manage_*` permission flags decide who can confirm a Tier-2 proposal. Tier-3 actions are blocked even with confirmation.

## Files to add or edit

**Edit**
- `supabase/functions/ai-agent-chat/index.ts` — add `find_team_member`, `propose_deactivate_team_member`, `propose_reactivate_team_member`, `propose_remove_team_member` to `TOOLS`. Update `SYSTEM_PROMPT` with the autonomy tiers and the rule "always propose, never execute mutations directly for HR actions."
- `supabase/functions/execute-ai-action/index.ts` — extend `ExecuteActionSchema` enum and add the three new switch cases. Each case enforces permission + identity + Account-Owner protection and writes to `ai_action_audit`.

**Add**
- `supabase/functions/_shared/team-member-mutations.ts` — extract the deactivate/reactivate/remove logic so both `SecurityTab` (via its existing hook) and `execute-ai-action` call the same code path. Single source of truth.
- `src/components/ai/ActionConfirmationCard.tsx` — the inline confirm/cancel card the chat surface renders for tool_call proposals.
- `src/components/ai/ActionConfirmationCard.test.tsx` — unit test the permission-aware rendering.
- DB migration: `ai_action_audit` table with RLS scoped to `organization_id` (Core: strict tenant isolation, `USING (true)` prohibited).

**Touch (light)**
- The Zura chat surface component (wherever the chat UI renders messages) — when a message has `tool_calls`, render `<ActionConfirmationCard>` instead of plain markdown.

## Security and governance checks (build gate)

Per your doctrine, this ships only if all of these hold:

- ✅ Tenant isolation: `ai_action_audit` RLS scoped to `organization_id`
- ✅ Server-side permission check (not client-side) in `execute-ai-action`
- ✅ Account Owner protection (cannot be deactivated by AI flow)
- ✅ Self-deactivation blocked
- ✅ Audit row written for every executed AI action
- ✅ Stylist Privacy Contract: stylist-role users cannot use the deactivate tools at all; the AI rejects the request and explains why
- ✅ Forbidden actions (commission %, terminations-for-cause, pay structure) explicitly listed in the system prompt as off-limits
- ✅ Materiality gate: ambiguous name → AI asks instead of proposes
- ✅ Confirmation card shows structural impact (upcoming appointments, login revocation) before the human commits

## Notes / gotchas

- The existing `ai-agent-chat` system prompt says *"Always confirm destructive actions before executing them"* — that's good intent but enforced only by the model. The architectural fix is that the **executor** doesn't have a "deactivate-no-confirm" code path at all. The model can't bypass what doesn't exist.
- "Deactivate" vs "Remove from organization" are two different DB operations in `SecurityTab.tsx`. The AI should default to **deactivate** (reversible) when a user says "fired" — and surface "Want to also remove org access entirely?" as a second proposal. Removal is destructive in the sense that it unlinks; data is preserved but the user can't be reactivated without re-invitation.
- Future appointment handoff is a separate decision. The deactivation should flag them but not auto-reassign. That's a Tier-2 follow-up the AI can propose next ("3 appointments need a new stylist — want me to suggest reassignments?").

## Prompt feedback

Strong prompt — one sentence framed the use case, the user, and the desired behavior. That's exactly the right altitude for a capability question. You let me decide the architecture instead of pre-constraining it.

One refinement: when asking about agent capabilities, you can shortcut the planning by naming the **autonomy tier** you want. E.g. "Can the AI auto-execute, or do I want a confirm step?" — that immediately frames the governance question and saves me from inferring from your doctrine. As-is, your existing memory made the answer obvious, but in a fresh project that context wouldn't be there.

## Enhancement suggestions

1. **Codify the autonomy tiers as a memory.** The Tier 1/2/3 split above is reusable for every future "can the AI do X?" question. Worth a `mem://architecture/ai-autonomy-tiers` entry so it's checked automatically next time someone asks.
2. **Build the `ai_action_audit` table now even if only HR actions use it initially.** Once it exists, every `execute-ai-action` case (reschedule, cancel, etc.) should also write to it. Right now those mutations are unaudited at the AI layer — that's a gap your doctrine wouldn't pass.
3. **Expose the audit feed in the existing "Recent activity" accordion** in `SecurityTab.tsx` (line 150–156 — currently a placeholder saying "not yet wired up"). That gap is the perfect home for "AI deactivated this user on April 29 at 2:14 PM, confirmed by [you]." Closes the audit loop visually.
4. **Disambiguation as a first-class UX pattern.** Build a small `<DisambiguationCard>` for when the AI returns multiple matches ("Chelsea Martinez or Chelsea Wong?"). Reusable for any entity resolution — clients, locations, services. This is more leverage than building it ad-hoc per tool.
