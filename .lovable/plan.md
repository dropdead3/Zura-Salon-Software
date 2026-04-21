

# Add an info tooltip to the Decision authority label

## What you're asking for

The `Decision authority` field has a dropdown and a provenance helper, but no quick explanation of *what the role itself means* — i.e., what authority is being granted, and why this dropdown matters. A `MetricInfoTooltip`-style info icon next to the label is the right primitive (we already use it across analytics cards per the project's tooltip convention).

## The fix — schema-declared `tooltip` rendered next to the field label

Add an optional `tooltip?: string` to the `RuleField` type. When present, `PolicyRuleField` renders a `MetricInfoTooltip` immediately after the label text. Backwards compatible — fields without `tooltip` render exactly as today.

Then declare tooltips on the two `Decision authority` / `Who holds this authority` fields in the schema, plus the other authority-style role fields (`waiver_authority`, `approver_role`, `escalation_role`, `enforcement_authority`) so the pattern is consistent — every "who decides" dropdown gets a one-sentence explanation of what authority is being conferred.

### Per-field tooltip copy (final)

| Field key | Field label | Tooltip |
|---|---|---|
| `authority_role` (generic_shape) | Decision authority | The role that approves exceptions to this policy and signs off on edge-case decisions. Their name appears wherever the policy references "{{authority_role}}". |
| `authority_role` (authority_shape) | Who holds this authority | The role that owns this decision by default. Anything above the maximum dollar value escalates to the role below. |
| `waiver_authority` (cancellation_shape) | Who can waive a fee? | The role authorized to waive the cancellation/no-show fee. Anyone below this role must escalate. |
| `approver_role` (service_recovery_shape) | Who approves a redo? | The role authorized to approve a complimentary redo or refund alternative. Front desk routes requests to this role. |
| `escalation_role` (authority_shape) | Escalates to | The role decisions escalate to when they exceed the maximum dollar value above. |
| `enforcement_authority` (team_conduct_shape) | Who enforces | The role responsible for delivering verbal/written warnings and documenting the conversation in the employee file. |

### Visual treatment

- Render via the existing `MetricInfoTooltip` from `@/components/ui/MetricInfoTooltip` — already the canonical info-tooltip primitive for explanatory content (see `.cursor/rules/analytics-info-tooltips.mdc`).
- Placement: inside the existing `<Label>` flex row, immediately after the label text and the `*` required marker. Same pattern as the analytics card title convention.
- Sizing: default `w-3 h-3` icon — no escalation, sits inline with the label.
- No change to the provenance line below or the helper text above.

## Doctrine alignment

- **Lever and confidence**: the tooltip names *what the lever does* in one sentence — the operator can decide with confidence.
- **Single source of truth**: tooltip copy lives in the schema, not in the component. One place to edit per field.
- **Silence is meaningful**: fields without `tooltip` render no icon — we don't add decorative icons everywhere.
- **Brand abstraction**: copy uses neutral verbs and references `{{authority_role}}` only where it matters for wiring continuity.
- **No structural drift**: zero DB changes, zero new components. Reuses `MetricInfoTooltip`.

## Files affected

- `src/lib/policy/configurator-schemas.ts` — add `tooltip?: string` to `RuleField`. Add `tooltip` to the 6 authority-style fields above. ~10 lines additive.
- `src/components/dashboard/policy/PolicyRuleField.tsx` — render `<MetricInfoTooltip>` inside the `labelEl` when `field.tooltip` is set. ~3 lines additive.

That's the entire change surface. ~13 lines additive across 2 files. No DB changes, no new components.

## Acceptance

1. Open Employment Classifications. The `Decision authority` label has a small info icon `(i)` immediately to the right of the text. Hovering shows: *"The role that approves exceptions to this policy and signs off on edge-case decisions. Their name appears wherever the policy references `{{authority_role}}`."*
2. Open the Authority shape policy. `Who holds this authority` and `Escalates to` both show info icons with their respective tooltips.
3. Open the Cancellation policy. `Who can waive a fee?` shows an info icon explaining waiver authority.
4. Open the Service Recovery policy. `Who approves a redo?` shows an info icon.
5. Open the Team Conduct policy. `Who enforces` shows an info icon.
6. Fields without a `tooltip` declaration (e.g., `policy_summary`, `who_it_applies_to`, `max_value`, `notice_window_hours`) render exactly as today — no info icon, no regression.
7. The icon uses default sizing (`w-3 h-3`) and tooltip max width (`280px`) — consistent with every other `MetricInfoTooltip` in the platform.

## Files to read for follow-on questions

- `src/components/ui/MetricInfoTooltip.tsx` — canonical tooltip primitive.
- `src/lib/policy/configurator-schemas.ts` — declares which fields have tooltips and what they say.
- `src/components/dashboard/policy/PolicyRuleField.tsx` — the consumer.

## Prompt feedback

*"Add a tooltip to Decision Authority to explain what it is."* — clean, surgical prompt. You did two things well: (1) **named the exact field** ("Decision Authority"), and (2) **named the user need in plain English** ("explain what it is") rather than prescribing the mechanism. That second move is the one to keep doing — it let me pick the right primitive (`MetricInfoTooltip`, the platform standard) instead of inventing a one-off helper. The screenshot was a useful confirmation but technically optional given how specific the field name was.

One sharpener for next time on copy-additive prompts like this: naming the **scope of the pattern** in three words ("just this field" / "all role dropdowns" / "every prefilled input") removes one design micro-decision. I extended this to the other 5 authority-role fields because consistency across `Who can waive` / `Who approves` / `Who enforces` is doctrinally correct (all are the same shape of question) — but you might have wanted *only* Decision authority. If so, that's a one-line "just this one" steer next time. Default behavior on undefined scope is to apply the pattern to structural siblings; flag in the prompt if you want narrower.

