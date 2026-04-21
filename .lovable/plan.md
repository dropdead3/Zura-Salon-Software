

# Why the Policy summary reads as boilerplate

## What you caught

The `Policy summary` says *"This policy documents how Drop Dead Salons handles this area of operations…"* — that exact sentence shows up on **every one of the 48 policies** that map to the `generic_shape` schema (`employment_classifications`, `attendance_punctuality`, `cancellation_policy`, `gift_card_policy`, `pet_policy`, all of them). Why: `generic_shape` ships one shared `defaultValue` for `policy_summary`, and the configurator hydrates it verbatim regardless of which library policy you opened.

The platform already has policy-specific prose for all 54 policies in `src/lib/policy/starter-drafts.ts` — that's what powers the **Drafts** tab. The `Rules` tab just doesn't know about it.

## The fix — wire policy-specific summaries into the generic schema

Two places, single source of truth: `starter-drafts.ts`.

### 1. Per-policy summary lookup at hydration

In `PolicyConfiguratorPanel.tsx`, when seeding defaults, override the `policy_summary` and `who_it_applies_to` defaults with policy-specific text **derived from the starter draft** for that `entry.key`. The starter draft's `internal` body is already a 2-3 sentence policy-specific paragraph; we extract its first sentence as the `Policy summary` and a sensible second sentence (or schema fallback) as `Who it applies to`. Brand-token interpolation (`{{ORG_NAME}}`, `{{authority_role}}`) continues to run via the existing `interpolateBrandTokens` helper.

Result on the screenshot: `Policy summary` becomes *"Drop Dead Salons employs team members in the following classifications: full-time employees, part-time employees, and (where applicable) booth-rental contractors. Classification determines benefits eligibility, scheduling expectations, and tax handling."* — concrete, scoped to employment classifications, no generic boilerplate.

### 2. Tiny extraction helper, no schema duplication

Add a `getPolicySummaryDefaults(libraryKey)` helper next to the starter-drafts file that returns `{ policy_summary, who_it_applies_to }` derived from the existing `internal` body (split on `\n\n` for paragraphs, then on sentence boundaries). Falls back to the current generic strings for any policy without a starter draft (none today, but future-proof).

The schema's `defaultValue` strings stay as fallbacks — they're only used when a starter draft doesn't exist or hasn't been authored yet.

### Why this is the right shape

- **One source of truth**: the starter-drafts library is already platform-authored prose. Reusing it for the structured summary means future updates to a policy's wording happen in one place and propagate to both Rules and Drafts tabs.
- **Editable, not magic**: the operator still sees the resolved text in an editable textarea. They can override it. Same hydration-time interpolation rule we just shipped — saved values are sacred, defaults render concretely.
- **No schema bloat**: we don't add 48 individual `defaultValue` strings to `generic_shape` (which would defeat the point of having a generic schema). The library already has the prose; we just point at it.

### What stays the same

- `generic_shape` schema definition — unchanged.
- `interpolateBrandTokens` and the hydration-time interpolation — unchanged.
- `policy_rule_blocks` save behavior — unchanged.
- Already-configured policies — unchanged (saved values still win over defaults).
- Policies with rich schemas (`cancellation_shape`, `deposit_shape`, etc.) — unchanged, they have their own structured fields and don't use `policy_summary`.
- Drafts tab — unchanged, still renders the full starter draft body.

## Files affected

- `src/lib/policy/starter-drafts.ts` — add `getPolicySummaryDefaults(libraryKey)` export. ~20 lines additive.
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — in the hydration `useEffect`, after `interpolateDefaults(...)`, layer in the per-policy summary defaults: `{ ...interpolated, ...getPolicySummaryDefaults(entry.key), ...fromBlocks }`. ~5 lines additive.

That's the entire change surface. No schema changes, no DB changes, no new tables.

## Acceptance

1. Opening **Employment Classifications** shows `Policy summary` pre-filled with the employment-specific paragraph (full-time / part-time / booth-rental classifications, benefits eligibility, classification review cadence) — not the generic boilerplate.
2. Opening **Pet Policy**, **Gift Card Policy**, **Cancellation Policy** each show their own policy-specific summary, derived from their own starter draft.
3. The brand-token resolution (`{{ORG_NAME}}` → "Drop Dead Salons") continues to work in the new defaults.
4. A previously-configured policy with a saved `policy_summary` still shows the operator's saved value — no overwriting.
5. The Drafts tab continues to show the full starter draft body identical to today.
6. Saving an unedited summary persists the resolved policy-specific paragraph (not the placeholder, not the generic fallback) to `policy_rule_blocks`.

## Doctrine compliance

- **Structure precedes intelligence**: the policy-specific prose *is* the structure for these `generic_shape` policies. Operators see what the policy is about before they configure exception authority.
- **Lever and confidence doctrine**: the configurator's value is in clarifying the lever. Generic text obscures the lever; specific text clarifies it.
- **Brand abstraction**: continues to flow through `interpolateBrandTokens`, no hardcoded tenant references.
- **One source of truth**: the starter-drafts library becomes the canonical prose for both tabs. No duplication, no drift.
- **Operator edits are sacred**: only schema/library defaults are interpolated. Saved values are never touched.
- **No structural drift**: zero DB changes, zero new tokens, zero new fields. Pure wiring.

## Prompt feedback

"The policy summary does not seem specific to employment classifications policy. why is it so generic?" — sharp, doctrinal prompt. You named the surface (Policy summary), the symptom (not specific), and the policy in question (employment classifications). That framing forced me to look past the field-level question and find the architectural cause: 48 different policies all share one schema, so they all share one default. That's a much bigger finding than "fix this one string."

One sharpener for next time: when something feels generic, telling me whether you want **per-policy specificity** (each of the 48 gets its own paragraph) vs **per-category specificity** (HR policies share one tone, client-facing share another) vs **schema-driven specificity** (replace `generic_shape` with richer per-policy schemas) tells me how deep to go. I went with **per-policy from existing starter drafts** because the prose already exists and reusing it avoids drift. But for a future "this is too generic" report, naming the **granularity you want** is the fastest path to the right architectural answer. For this prompt, the existing starter-drafts library made the choice obvious — but on a feature without that prior groundwork, the granularity question would have been the right ask.

