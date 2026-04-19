
## Wave 28.6 — AI Drafter + 3 enhancements bundled

Three enhancements layer cleanly into 28.6 because the AI drafter needs surface-mapped policies with applicability to draft well. Bundling them now means the AI sees a denser configuration when it runs.

### Enhancement feedback

These three are tightly aligned with the doctrine. Worth naming why each works:

1. **Profile-seeded applicability** — converts `policy_org_profile` (28.3) from a one-time recommendation filter into a continuous defaults engine. Every new policy adoption inherits org reality. This is the lever doctrine applied to UX: reduce ambiguity at the source rather than asking the operator to re-enter what we already know.
2. **Surface chips on library cards** — reinforces the "one policy, many surfaces" mental model *before* adoption. Without this, operators only learn the architecture after they've adopted 5 policies. With it, the architecture is visible from card 1.
3. **Surface-conflict detection** — first true Conflict Center signal (a Wave 28.9 capability landing early). Two cancellation policies wired to booking is a silent config bug today; this makes it loud. Sits cleanly in `usePolicyHealthSummary` because it needs the same `org-policies + surface_mappings` join the health strip already does.

**To level up your enhancement prompts:** you grouped three improvements by *layer* (data → UI → governance), which is exactly the right framing for batched enhancements. The pattern: **when bundling improvements, name the layer each one targets — it tells me what code paths to touch and surfaces conflicts between enhancements early.** A future iteration could add an explicit priority ("ship #3 even if #1 slips") to make slip handling deterministic.

### Build sequence

| Step | Scope | Files |
|---|---|---|
| **1. Surface chips** (smallest) | Add candidate-surface chips to `PolicyLibraryCard`. New field `surface_candidates` already exists on `policy_library` (text[]); render up to 4 icons inline below the audience badge. | `PolicyLibraryCard.tsx`, `usePolicyApplicability.ts` (export `SURFACE_META.icon`) |
| **2. Profile-seeded applicability** | When `PolicyApplicabilityEditor` mounts with `rows.length === 0` and policy is freshly adopted, seed scopes from `policy_org_profile`: `role` ← `roles_used`, `service_category` ← `service_categories`, `location` ← all org locations. Operator sees pre-filled chips, can deselect. Mark as "suggested" in UI (subtle "(from profile)" hint). | `PolicyApplicabilityEditor.tsx`, new `seedApplicabilityFromProfile()` helper in `usePolicyApplicability.ts` |
| **3. Surface-conflict detection** | Extend `usePolicyHealthSummary` to compute `surface_conflicts: Array<{surface, category, policy_keys[]}>`. Two policies of the same `category` both mapped to the same `surface` = conflict. Surface count on dashboard via new `PolicyConflictBanner` (silent when zero conflicts — visibility contract). | `usePolicyData.ts`, new `PolicyConflictBanner.tsx`, `Policies.tsx` |
| **4. AI Drafter — schema + RPC** | New table `policy_draft_jobs` (id, version_id, variant_type, status, model, prompt_hash, output_md, error, created_at). Edge function `policy-draft-variants` calling Lovable AI Gateway (`google/gemini-2.5-pro`) with strict guardrails. | Migration + edge function |
| **5. AI Drafter — UI** | New 4th tab "Drafts" in `PolicyConfiguratorPanel`. 4 cards (Internal · Client-Facing · Short Disclosure · Manager Note). Each: status, last drafted, [Generate] / [Regenerate] / [Approve] / [Edit]. Approved variants flow into `policy_variants` (existing table). Side-by-side compare for two existing variants. | `PolicyDraftWorkspace.tsx`, `usePolicyDrafter.ts`, `PolicyConfiguratorPanel.tsx` |

### AI Drafter — guardrails (non-negotiable)

Per doctrine ("AI must not invent terms, fees, timelines, eligibility"):

- **Input contract:** prompt is built from `policy_rule_blocks` (structured) + `policy.intent` + variant tone instructions. Free-text user input is NOT accepted into the prompt.
- **Required-rule check:** if any `required: true` rule block has empty value, drafter is disabled with message "Configure required rules first."
- **Output validation:** generated markdown is rendered as-is; AI cannot mutate `policy_rule_blocks`. Operator must explicitly [Approve] before `policy_variants.approved = true`.
- **Tone variants are renderings, not interpretations:** prompt explicitly instructs the model to render the same rules in 4 voices. No new conditions, no new fees, no new exceptions.
- **Provenance:** every draft writes `ai_generated: true` and `last_drafted_at`. Approved variants keep the flag — operators can see what's AI-touched vs hand-written.
- **Edge function security:** uses service-role client, validates JWT, scopes by `organization_id`. Returns 429 on rate limit (handled in UI with toast).

### Data model addition

```text
policy_draft_jobs
  id uuid pk
  organization_id uuid (RLS)
  version_id uuid → policy_versions
  variant_type text (internal|client|disclosure|manager_note)
  status text (queued|running|succeeded|failed)
  model text (default 'google/gemini-2.5-pro')
  prompt_hash text
  output_md text
  error text
  created_by uuid
  created_at timestamptz
```

RLS: `is_org_admin` for write, `is_org_member` for read. Indexed on `(organization_id, version_id, created_at desc)`.

### Doctrine checks

- ✅ **AI governance**: structured input only, no rule invention, explicit approval gate, provenance flagged
- ✅ **Tenant isolation**: all 3 enhancements + AI tables org-scoped with RLS
- ✅ **Visibility contract**: `PolicyConflictBanner` returns null when zero conflicts (silent when material threshold unmet)
- ✅ **Lever doctrine**: conflict banner shows ≤1 primary conflict at a time with expandable detail
- ✅ **UI tokens**: `tokens.card.iconBox`, `tokens.card.title`, Termina headers, `font-medium` max
- ✅ **No hype copy**: "Generated draft ready for review" not "AI-powered magic draft"
- ✅ **Phase alignment**: Phase 2 (advisory) — drafts recommend, owner approves, never auto-publish

### Out of scope (deferred to 28.7+)

- Side-by-side compare across **versions** (vs across variants) — needs version history UI from 28.9
- Bulk regenerate all variants for one policy — wait until cost/latency profile is known from single-variant usage
- AI feedback loop ("this draft is too strict") — not until we have approve/reject signal density

After 28.6 ships, next is **28.7 — Handbook Wizard refactor** (handbook sections gain `policy_ref_id`, render from policy variants).
