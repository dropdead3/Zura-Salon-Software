# Fix: Zura claimed "Done." without an approval card

## What actually happened

Edge logs for the `deactivate chelsea` turn show exactly one tool call:

```
[capability-tool] find_entity { entity_type: "team_member", query: "chelsea" }
```

That's it. The model resolved Chelsea's ID, then **never called `propose_capability`**. It just wrote a follow-up message and returned. Two things then combined to produce the "Done." bubble:

1. **The model hallucinated completion.** With no mutation tool called, it still answered as if the action had run. This is the autonomy-doctrine violation: silent claim of execution.
2. **The follow-up fallback in `ai-agent-chat/index.ts` line 496** is `const finalMessage = followUpResult.choices?.[0]?.message?.content || "Done."`. So even if the model returned an empty content (which is plausible after a single read-only tool call), the server *defaults the user-visible string to literally the word "Done."* That default is what the user saw — and it reads like confirmation of execution. **Chelsea was not deactivated** (no `proposed`/`executed` audit row exists for that turn).

So the bug is layered: model didn't propose → server's fallback string lied for it → UI had no `action` payload to render an approval card → user reasonably assumed it ran.

## Fix plan

### 1. Kill the "Done." fallback (P0 — root cause of the lie)

In `supabase/functions/ai-agent-chat/index.ts`:

- Replace `|| "Done."` with a neutral, non-committal fallback when the model returns empty content after tool use.
- If the only tools called this turn were **read-only** (`find_entity`, `execute_capability`) AND no `action` was produced AND the model's text is empty/whitespace, return: *"I looked that up but didn't take any action. What would you like to do?"*
- If a mutation-class verb appears in the user's last message (deactivate, delete, cancel, refund, fire, remove, archive, reschedule, void) AND no `propose_capability` action was produced, return a **doctrinal refusal**: *"I can't do that without staging an approval first. Try again and I'll prepare a card you can confirm."* This is the same shape as the existing rate-limit/anomaly returns.

### 2. Harden the system prompt (P0 — prevent the hallucination)

Add an explicit clause to `buildSystemPrompt` in the same file:

- **"NEVER claim an action was performed unless you actually called `propose_capability` AND the user approved it. After a read-only tool, summarize what you found — do not say 'Done', 'Completed', or 'I deactivated…'."**
- **"If the user asks for a mutation, your turn MUST end with a `propose_capability` tool call. If you can't (missing IDs, ambiguous match), ask a clarifying question instead — never narrate a fake completion."**

Move these to the top of HARD RULES so they outrank tool-choice freedom.

### 3. Server-side tripwire (P1 — defense in depth)

In the tool-handling block (around line 455), detect the failure mode before responding:

- If the user's most recent message matches a mutation-intent regex AND no `propose_capability` ran this turn AND no `action` was produced, log an `autonomy_violation` anomaly via `recordAnomaly` and override the response with the doctrinal refusal from step 1. This guarantees the rule is enforced even if a future model regresses.

### 4. UI affordance (P1 — make silent claims impossible to miss)

In `src/components/dashboard/help-fab/AIHelpTab.tsx`:

- When an assistant message contains words like "deactivated", "deleted", "cancelled", "refunded", "removed", "rescheduled" but **has no `action` attached and no preceding executed action in this conversation**, render a small amber inline notice under the bubble: *"This was a description only — no action was taken."* This catches any leftover hallucinations that slip past the server.

### 5. Audit trail visibility (P2)

The current AI Audit Trail (`src/pages/dashboard/admin/AIAuditTrail.tsx`) only shows rows that reached `proposed` status. Add a "Hallucinated completions" filter sourced from the new `autonomy_violation` anomaly type, so account owners can see when the model claimed action without staging one.

## Files touched

- `supabase/functions/ai-agent-chat/index.ts` — fallback string, system prompt clauses, tripwire
- `src/components/dashboard/help-fab/AIHelpTab.tsx` — inline "no action taken" notice
- `src/pages/dashboard/admin/AIAuditTrail.tsx` — anomaly filter

No DB migration required — `recordAnomaly` already supports arbitrary `type` strings.

## What you'll see after

- Same prompt ("deactivate chelsea") will return either a proper approval card *or* a refusal asking you to retry — never a silent "Done."
- Account owners can audit any hallucinated-completion attempts under AI Audit Trail.

---

## Enhancement suggestions (per project doctrine)

1. **Confidence qualification on mutation proposals.** Today `propose_capability` always stages the action if the model picks the right tool. Consider adding a server-side confidence check: for `risk_level: 'high'` capabilities (terminations, refunds, mass deletes), require the model to also pass a short `confidence_factors` array (e.g., "exact name match", "user used explicit verb 'fired'"). If fewer than 2 factors, return a clarifying question instead of a card. Aligns with the doctrine's "If confidence is low, Zura remains silent."

2. **Turn the "+ New" button into a real reset signal.** Right now it only matters when a thread exists. Repurpose its disabled state into an *empty-state hint*: "Pick a suggestion below to start" — gives it a job even on a fresh chat.

3. **Pending-action persistence across reload.** If the user closes the FAB while a card is pending, the card disappears and the audit row sits in `proposed` forever. On hydrate, re-surface any `proposed` row from the last 15 minutes for the active conversation so approval state survives navigation.
