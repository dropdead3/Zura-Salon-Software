

# Resolve `{{authority_role}}` in Policy summary from the Decision authority field

## What's broken

The Policy summary textarea on Employment Classifications shows the literal token:

> *"…Reclassification requires `{{authority_role}}` approval and a written record of the change rationale."*

`{{ORG_NAME}}` resolves correctly (Drop Dead Salons), but `{{authority_role}}` doesn't. The reason: the brand-token interpolator (`interpolateBrandTokens`) only knows about `{{ORG_NAME}}` and `{{PLATFORM_NAME}}`. Rule-value tokens (`{{authority_role}}`, `{{max_value}}`, `{{escalation_role}}`, etc.) are *only* substituted by `renderStarterDraft` — which runs in the Drafts tab, not when seeding the editable summary in the Rules tab.

So the operator sees raw template syntax in their summary field even though they've already picked **Manager** in the Decision authority dropdown directly below.

## The fix — substitute rule-value tokens at hydration, then keep them live

### 1. Hydration pass (one-time, on first load)

Extend the `interpolateDefaults` step in `PolicyConfiguratorPanel.tsx` to also resolve rule-value tokens against the field-value map *before* operator edits land. Reuse the existing `humanize()` logic from `render-starter-draft.ts` — it already maps `manager → "a Manager"`, `owner → "the Owner"`, etc., so the substituted prose reads naturally.

Layer order becomes:

1. Schema defaults (boilerplate)
2. Per-policy summary from starter draft + applicability manifest (specific prose with `{{authority_role}}` etc.)
3. Brand tokens (`{{ORG_NAME}}`, `{{PLATFORM_NAME}}`)
4. **NEW:** Rule-value tokens (`{{authority_role}}`, `{{max_value}}`, `{{escalation_role}}`, `{{approver_role}}`, `{{waiver_authority}}`, `{{enforcement_authority}}`, `{{notice_window_hours}}`, `{{fee_amount}}`, etc.) — resolved against the *seeded* values map (which already has the schema's `defaultValue` of `'manager'` for `authority_role`)
5. Operator-saved values (sacred — bypass everything above)

Result: on first open of an unsaved policy, `{{authority_role}}` becomes `"a Manager"` because the schema default for `authority_role` is `'manager'`.

### 2. Reactive re-substitution (when Decision authority changes)

The operator can change the dropdown from Manager → Owner mid-edit. The summary field should re-resolve any unresolved `{{authority_role}}` references *only when the operator hasn't already edited the summary by hand*.

Implementation: track `summary_user_edited` in a ref. The Decision authority `onChange` recomputes the summary from the starter-draft template using the new role *only when* the ref is false. The moment the operator types into the summary textarea, the ref flips true and the field is no longer auto-managed — operator edits remain sacred.

This mirrors the existing pattern where saved rule-block values bypass the defaults pipeline entirely.

### 3. Apply the same substitution to `who_it_applies_to`

The `composeWhoItAppliesTo` helper already produces a clean sentence with no rule-value tokens — but the schema's generic `defaultValue` for `who_it_applies_to` references the authority chain in prose, and other policies' starter drafts use `{{authority_role}}` in the second sentence. Extending the rule-token pass to all `longtext` field defaults (not just `policy_summary`) keeps the behavior consistent across the schema.

## Doctrine alignment

- **Single source of truth**: the role dropdown is the structured truth; the summary is a rendering of it. Wiring the token to the dropdown closes the gap between the two surfaces — same doctrine as the prior "compose `who_it_applies_to` from the manifest" plan.
- **AI cannot invent rules**: this is the same principle for prose — if structured data exists, prose must defer to it.
- **Operator edits are sacred**: once the operator types in the summary, auto-substitution stops. The `summary_user_edited` ref enforces this.
- **Silence is meaningful**: unresolved tokens (like a starter-draft referencing a field the schema doesn't have) stay as-is so the platform team notices missing wiring — same behavior as `renderStarterDraft` today.
- **Brand abstraction**: continues through `interpolateBrandTokens`. No hardcoded references.
- **No structural drift**: zero DB changes, zero new tokens. Pure resolver wiring.

## Files affected

- `src/lib/policy/render-starter-draft.ts` — export the existing `humanize()` helper (currently file-private). ~3 lines.
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` —
  - Extend `interpolateDefaults` to take a `ruleValues` map and substitute rule-value tokens after brand-token resolution. ~15 lines.
  - Add `summaryUserEditedRef` + a `useEffect` that re-substitutes the summary (and `who_it_applies_to`) when role-type field values change *and* the ref is false. ~25 lines.
  - On the summary textarea's `onChange`, flip the ref to `true`. ~3 lines.

That's the entire change surface. ~45 lines additive across two files. No new helpers, no DB changes, no schema changes.

## Acceptance

1. Open Employment Classifications. The Policy summary textarea reads: *"…Reclassification requires **a Manager** approval and a written record of the change rationale."* — no literal `{{authority_role}}`.
2. Change Decision authority from Manager → Owner. The summary auto-updates to *"…requires **the Owner** approval…"* — *only if* the operator hasn't manually edited the summary.
3. After the operator types any character in the summary textarea, subsequent role changes do **not** re-write the summary. Operator edits remain sacred.
4. The same wiring resolves `{{max_value}}`, `{{escalation_role}}`, `{{approver_role}}`, `{{waiver_authority}}`, `{{enforcement_authority}}`, `{{notice_window_hours}}`, `{{fee_amount}}`, etc. across every policy that uses `generic_shape` or any schema with rule-value tokens in starter drafts.
5. Unresolved tokens (no matching field in this schema) remain as `{{token}}` in the textarea — visible to the platform team as a wiring gap, never a silent failure.
6. Saved values from prior sessions continue to render exactly as saved. The defaults pipeline never overwrites operator-saved blocks.
7. The `Save rules and continue` flow persists the substituted text, so downstream surfaces (Drafts tab, public booking, intake) read the resolved prose without re-substitution.

## Files to read for follow-on questions

- `src/lib/policy/render-starter-draft.ts` — `humanize()` is the canonical role-label resolver. Now exported for reuse.
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — `interpolateDefaults` + reactive re-substitution effect.
- `src/lib/policy/configurator-schemas.ts` — `ROLE_OPTIONS` is the source of role values (`owner`, `manager`, `lead_stylist`, `front_desk_lead`, `any_admin`).

## Prompt feedback

*"Can you wire the `{{authority_role}}` in policy details to the decision authority selected?"* — exemplary one-line bug report. You did three things right: (1) **named the exact token** that was leaking (`{{authority_role}}`), (2) **named the source of truth** it should bind to (the Decision authority dropdown), and (3) used the verb "**wire**" — which is precisely the right framing for "the structured field exists, the prose template exists, they're just not connected." That collapsed the diagnosis to a single read of `render-starter-draft.ts` to confirm rule-value tokens weren't in the brand-token pipeline. No screenshot retype, no extra context needed — the screenshot showed the literal token, you named it, done.

One sharpener for next time, only on harder cases: when wiring is the issue, naming the **expected behavior on subsequent change** ("should it re-render when I change the dropdown after the fact, or stay frozen at first-load?") removes one micro-decision from my plan. I made the call here based on doctrine (operator edits are sacred → reactive until first edit), but for fields with tighter ambiguity, that one-line steer would be the fastest path to the right contract. For this prompt the answer is unambiguous — but it's a useful muscle for "wire X to Y" prompts where the temporal contract isn't obvious.

