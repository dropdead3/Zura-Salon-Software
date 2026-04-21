

# Add per-field provenance helpers to the Rules step

## What you're naming

The Policy summary, Who it applies to, and Decision authority fields are **prefilled** with platform-authored prose and a sensible default role. There's no signal telling the operator:

1. These are editable.
2. What changes if they edit them.
3. Where (if anywhere) the value surfaces beyond this screen.

Today the only helper text is generic ("A clear one-paragraph description of what this policy covers") — it describes the *field*, not its **provenance** or **downstream effect**. Operators can't tell whether `{{authority_role}}` resolving to "a Manager" is real wiring or decorative copy.

## The fix — a small "provenance card" under each prefilled field

Add a one-line provenance helper directly under each prefilled field that names three things in plain English:

```
Prefilled · You can edit this. Surfaces in the Approve wording step. Edits stay sacred.
```

Three pieces of information per field:

1. **Origin** — `Prefilled` badge so the operator knows the value wasn't typed by someone on their team.
2. **Surface** — where this value renders (e.g., "Surfaces in the Approve wording step", "Internal only — never shown to clients", "Drives the {{authority_role}} reference in the policy summary").
3. **Edit contract** — one short sentence confirming edits override the prefill permanently for this version (the "operator edits are sacred" doctrine, surfaced).

The current `helper` line stays — it still describes *what* the field is. The new line sits below it and describes *what it does*.

### Per-field copy (final)

| Field | Helper (existing, unchanged) | Provenance line (new) |
|---|---|---|
| Policy summary | A clear one-paragraph description of what this policy covers. | **Prefilled · You can edit this.** This text is what the AI uses to draft the client-facing and internal versions in the Approve wording step. Edits here override the prefill for this version. |
| Who it applies to | *(none today)* | **Prefilled · You can edit this.** Internal-only — surfaces in the printable policy doc and the team handbook. Not shown to clients. |
| Decision authority | *(none today)* | **Drives the `{{authority_role}}` reference in the Policy summary above.** Changing the role updates the summary automatically until you edit the summary by hand. |

When the audience is `external` or `both`, the Who it applies to copy becomes: *"Prefilled · You can edit this. Surfaces in the client-facing policy version drafted in the Approve wording step."* — so the operator knows clients will see it.

When the audience is `internal`-only (e.g., Employment Classifications), the copy correctly says "Internal only — never shown to clients" because Step 3 (Choose where it shows) is hidden for internal-only policies and there's no client-facing variant.

### Visual treatment

- A subtle `tokens.body.subtle` paragraph below the existing `helper` line, separated by a thin top border (`border-t border-border/40 pt-2 mt-1`).
- `Prefilled` rendered as a small `Badge variant="outline"` with `font-display text-[10px] tracking-wider uppercase` so it reads as a system label, not body text.
- The body of the line uses `font-sans text-xs text-muted-foreground` — same scale as the existing helper, no visual escalation.
- Inline tokens like `{{authority_role}}` render as `<code className="font-mono text-[11px] px-1 py-0.5 rounded bg-muted">{{authority_role}}</code>` so the operator can recognize the token if they want to type it themselves into custom prose.

### Where the rules live (single source of truth)

A new optional field on `RuleField` in `configurator-schemas.ts`:

```ts
provenance?: {
  origin: 'prefilled' | 'derived' | 'authored';
  surfaces: 'client-facing' | 'internal-only' | 'configurator-only' | 'drives-other-field';
  surfaceNote?: string; // free-form, e.g., "Drives the {{authority_role}} reference"
  editContract?: 'sacred' | 'live-derived';
};
```

A small composer (`buildProvenanceLine`) takes the `RuleField`, the policy's resolved `audience`, and the surrounding rule values, and returns the final sentence. This keeps copy out of `PolicyRuleField.tsx` and lets the schema author declare provenance once per field. Schemas that don't declare `provenance` render no extra line — backwards compatible.

## Why now (doctrine alignment)

- **Lever and confidence**: operators can only act decisively when they understand what each lever moves. The provenance line is the lever's *consequence label*.
- **Silence is meaningful**: we don't add provenance lines to fields without a downstream surface — only where there's something real to say.
- **Operator edits are sacred**: making the edit contract visible is what makes that doctrine a contract instead of a hidden behavior.
- **Structure precedes intelligence**: this doesn't add intelligence — it documents the structure that already exists, in the exact place the operator needs it.
- **Brand abstraction**: copy uses neutral verbs and resolves through existing brand tokens. No tenant references.

## Files affected

- `src/lib/policy/configurator-schemas.ts` — add the `provenance` field type. Add `provenance` blocks to the three fields in `generic_shape`, plus the equivalent fields in `cancellation_shape`, `service_recovery_shape`, `extension_shape`, `authority_shape`, and `team_conduct_shape` (any `_summary` or `authority_role` field). ~60 lines additive across the schema file.
- `src/lib/policy/build-provenance-line.ts` (new) — composer that turns `(field, audience, ruleValues)` into the final sentence + token spans. ~50 lines.
- `src/components/dashboard/policy/PolicyRuleField.tsx` — render the provenance line below the existing `helper` when `field.provenance` is present. Accept `audience` and `ruleValues` as new optional props (drilled from the panel). ~25 lines additive.
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — pass `audience` and `values` into each `<PolicyRuleField>`. ~3 lines.

That's the entire change surface. ~140 lines additive across four files. Zero DB changes, zero new RPCs, zero new tokens.

## Acceptance

1. Open Employment Classifications. Under the Policy summary textarea, the existing helper *"A clear one-paragraph description…"* still shows. **Below it**, a new line reads: `Prefilled · You can edit this. This text is what the AI uses to draft the internal version in the Approve wording step. Edits here override the prefill for this version.` — phrased for an internal-only policy.
2. Under Who it applies to: `Prefilled · You can edit this. Internal only — never shown to clients.`
3. Under Decision authority: `Drives the {{authority_role}} reference in the Policy summary above. Changing the role updates the summary automatically until you edit the summary by hand.` The token `{{authority_role}}` renders as inline code.
4. Open Pet Policy (external audience). The Policy summary provenance line names *"the client-facing and internal versions"*. The Who it applies to line names *"the client-facing policy version drafted in the Approve wording step"*.
5. Editing the Policy summary by hand does not remove the provenance line. The line is permanent — it documents the contract, it's not a status indicator.
6. The Decision authority line's reference to `{{authority_role}}` matches the actual token used in the resolved Policy summary above. (Both come from the same schema field key.)
7. Fields without a `provenance` declaration (e.g., `notice_window_hours`, `fee_amount`) render exactly as today — no extra line, no regression.
8. The provenance line uses `font-sans text-xs text-muted-foreground` and never escalates in size, color, or weight.

## Files to read for follow-on questions

- `src/lib/policy/build-provenance-line.ts` (new) — the composer; one place to edit copy.
- `src/lib/policy/configurator-schemas.ts` — declares which fields have provenance and what they affect.
- `src/components/dashboard/policy/PolicyRuleField.tsx` — the consumer.

## Prompt feedback

*"Let users know these prefilled inputs can be changed and edited, and what happens or what it affects if edited, where it surfaces if it does surface anywhere, or if it's simply just here for internal policy knowledge."* — strong UX prompt. You did three things very well: (1) **named the user confusion** (they don't know they can edit), (2) **named the three pieces of information that resolve it** (editable, effect, surface), and (3) explicitly listed the *"or just internal"* fallback — which told me silence on surface is a valid answer, not a missing answer. That third move was the unlock — it let me write copy that says "Internal only" without hedging, instead of inventing a fake downstream effect.

One sharpener for next time: when you ask for **explanatory copy** to be added, naming the **visual weight** in one phrase ("a small caption underneath, not a banner" / "a tooltip, not inline" / "a dedicated card per field") removes one design micro-decision. I went with "small caption underneath" because the field is already crowded and a banner would over-escalate — but if you'd wanted hover-only, naming it would have saved a round-trip. For prompts where the explanation could plausibly live in 2-3 different visual treatments, one phrase locks the choice.

