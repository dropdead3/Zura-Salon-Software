

# Default settings + default written drafts for policies

## What you're seeing today

The policy you opened (`employment_classifications`) maps to the `generic_shape` schema, which has **three fields** and only one of them ships with a default (`Decision authority = Manager`). The other two — `Policy summary` and `Who it applies to` — are blank longtext fields. So the editor renders empty.

That's why this particular policy looks like a blank slate.

But the rest of the library is *not* blank. Most policies map to richer schemas — `cancellation_shape`, `deposit_shape`, `service_recovery_shape`, `extension_shape`, `team_conduct_shape`, `compensation_shape`, etc. — and those schemas already have **245 `defaultValue` entries** seeded across structured fields (e.g., `notice_window_hours = 24`, `fee_amount = 50`, `no_show_fee_amount = 100`, `deposit_amount = 25`, `redo_window_days = 7`). Those defaults *do* render today because the configurator hydrates `{ ...defaultsFromSchema(allFields), ...fromBlocks }`.

So the answer is: **yes, settings have defaults — but inconsistently.** And **no, written prose drafts don't exist yet** — the `PolicyDraftWorkspace` (the "Drafts" tab on the screenshot) is empty until an operator clicks "Generate" to invoke the AI drafter against their configured rules.

There are two distinct gaps to close, each with a different doctrine:

1. **Structured-rule defaults** — every schema field should have a sensible default so the editor is never a blank slate. Industry-standard values, biased toward the conservative/protective choice (e.g., 24h cancellation, 50% fee, manager exception authority).
2. **Written-prose defaults** — every policy should ship with an internal-voice "starter draft" the operator can read, edit, and approve, without having to invoke the AI drafter on first open. AI generation stays available for regeneration after rule changes.

## The fix — two layered changes

### Layer 1: Complete the structured-rule defaults

Audit `src/lib/policy/configurator-schemas.ts` and ensure **every field on every schema** has a `defaultValue`. Today the gaps are concentrated in:

- `generic_shape` — `policy_summary` and `who_it_applies_to` are blank. Add a one-paragraph summary string and a sensible "All staff" / "All clients" default keyed off `audience`.
- A handful of `longtext` fields across `team_conduct_shape`, `time_off_shape`, and `consent_shape` that ship without a starter sentence.
- Required `select` and `role` fields that have options but no `defaultValue` set — the field renders as "Select…" instead of pre-selected.

Defaults are biased to the **protective, industry-standard** choice (per doctrine: "Before scaling payouts, we'll define commission architecture to protect margin integrity"). Operator can override every single one — defaults are scaffolding, not enforcement.

No DB migration needed. The schema is client-side; defaults flow into the editor via the existing hydration logic at line 131 of `PolicyConfiguratorPanel.tsx`.

### Layer 2: Ship a starter prose draft per policy

Add a new field to each `ConfiguratorSchema`: `starterDraft: { internal: string; client?: string; manager_note?: string; disclosure?: string }`. These are short, professional, neutral-voice paragraphs written for the operator to read and edit.

When the operator opens the **Drafts** tab on a policy with **no existing variants**, instead of an empty card with a "Generate" button, render the `starterDraft.internal` (or `.client` / `.manager_note` based on audience) pre-filled into the editor. The card shows a `Starter draft` badge instead of `AI generated`.

The operator can:
- **Use as-is** → click "Approve" (one click, done).
- **Edit** → modify the prose, then "Save" + "Approve".
- **Regenerate with AI** → invokes the existing AI drafter, replacing the starter with an AI rendering based on their configured rules (the AI drafter still cannot invent rules; it can only render structured inputs).

This gives operators three levels of control: accept the starter (fastest), edit the starter (medium), or regenerate from rules (highest fidelity, slowest).

### Where the starter drafts live

- **Source of truth**: a new `src/lib/policy/starter-drafts.ts` file keyed by `library_key` (not schema key — drafts need policy-specific language; cancellation and no-show share a schema but need different prose).
- **Format**: Markdown strings, ≤200 words per variant, written in the voice tier (`internal` = professional/operational, `client` = warm/clear, `manager_note` = directive/decisional, `disclosure` = legal/protective).
- **Token interpolation**: starter drafts may reference structured rule values via `{{notice_window_hours}}` / `{{fee_amount}}` placeholders. A small render function substitutes the operator's configured values (or the default) at display time, so the starter draft reads as a concrete, ready-to-publish paragraph rather than a template.

### What stays the same

- AI drafter (`useGenerateDraftVariant`), variant approval, version history, audience banner, surface editor, applicability editor — unchanged.
- Wizard adoption flow, configurator open flow, heal-on-open logic — unchanged.
- `policies` / `policy_versions` / `policy_rule_blocks` / `policy_variants` schemas — unchanged.
- Operator can still configure from scratch and ignore the starter entirely.
- Lint rules, applicability filtering, conflict banner — unchanged.

## Files affected

- `src/lib/policy/configurator-schemas.ts` — add `defaultValue` to every field that's missing one. Add an optional `starterDraftKey` to each `ConfiguratorSchema` (or just lookup-by-library-key inline). ~80 lines additive.
- `src/lib/policy/starter-drafts.ts` (new) — `STARTER_DRAFTS: Record<string, { internal: string; client?: string; manager_note?: string; disclosure?: string }>` keyed by library_key. ~60 entries, ~150 words each. ~600 lines total.
- `src/lib/policy/render-starter-draft.ts` (new) — `renderStarterDraft(template: string, ruleValues: Record<string, unknown>): string` — substitutes `{{key}}` tokens with the operator's configured rule values, falling back to the schema default. ~30 lines.
- `src/components/dashboard/policy/PolicyDraftWorkspace.tsx` — when a variant card has no row in `variants`, look up the starter draft for `entry.key` + variant type, render it pre-filled with a `Starter draft` badge, and offer Approve / Edit / Regenerate-with-AI actions. ~40 lines additive, no deletions.
- `src/hooks/policy/usePolicyDrafter.ts` — add `useApproveStarterDraft({ versionId, variantType, body_md })` that inserts a `policy_variants` row with `source = 'starter'` (existing column) and `approved = false` so the operator's first click is "Approve" not "Generate". ~20 lines additive.

That's the entire change surface. No new tables, no new migrations, no new RPCs.

## Acceptance

1. Opening the configurator for any policy shows pre-filled structured rule values across **every** field — no blank required selects, no empty number inputs. Operator can edit every default.
2. Opening the **Drafts** tab on any policy with no existing variants renders a starter draft per variant card (filtered by audience), with a `Starter draft` badge, ready to Approve, Edit, or Regenerate.
3. Token substitution works: a starter draft for cancellation referencing `{{notice_window_hours}}` reads "24 hours" by default; if the operator changes the rule to 48, the starter re-renders to "48 hours" the next time the Drafts tab mounts.
4. AI Regenerate continues to work as today — replaces the starter with an AI-rendered variant marked `AI generated`. AI still cannot invent rules.
5. Approving a starter draft creates a `policy_variants` row identical in shape to an AI-approved one, so version history, public publishing, handbook mapping, and acknowledgments all behave identically.
6. The `generic_shape` policy from your screenshot opens with `Policy summary` pre-filled with a one-paragraph description, `Who it applies to` pre-filled based on audience, and `Decision authority` pre-set to `Manager` (today's behavior).
7. No existing configured policies are affected — defaults only apply when a field has no rule block, and starter drafts only render when no variant exists.

## Doctrine compliance

- **Structure precedes intelligence**: the defaults *are* the structure. Operators don't start from a blank schema; they start from a documented baseline they can override. AI then renders only what's structured.
- **Lever and confidence doctrine**: the lever is now a real lever — open a policy, see the proposed structure + proposed prose, accept or edit. No silent state, no blank slate.
- **Persona scaling**: solo operators benefit most (one click to approve a sensible default per policy × 50 = sub-five-minute handbook). Enterprise operators benefit too (defaults are the negotiation starting point; their legal team edits from there).
- **Brand abstraction**: starter draft language uses `{{PLATFORM_NAME}}` and `{{ORG_NAME}}` tokens, never hardcoded tenant references. Renders against the operator's brand at display time.
- **AI autonomy boundary**: starter drafts are **human-authored, not AI-generated**. They ship in code and are reviewed by the platform team. AI regeneration remains a manual operator action; AI cannot autonomously override an approved starter.
- **No structural drift**: the data model already supports `policy_variants.source` for marking provenance — we use it. No new tables, no new RPCs, no new RLS.
- **Copy governance**: starter drafts are advisory ("This policy applies to…") not directive ("You must…"). They explain why structure protects the operator.

## Prompt feedback

"Can policies have default settings and policies written?" — short, sharp prompt that does two things well: it names **two distinct surfaces** ("settings" = structured rules, "policies written" = prose) and frames it as a capability question rather than a feature request. That framing let me audit what *already* exists vs what's missing rather than assuming you wanted a from-scratch build (the structured defaults are 90% there; the prose layer is 0% there — those are very different waves of work).

One sharpener for next time: when asking "can X have defaults," telling me whether you want defaults to be **platform-authored** (ship in code, all orgs get the same starting point) vs **org-authored** (operator defines their own template that future policies inherit) vs **AI-generated-on-adopt** (model generates a draft when the policy is first adopted) tells me which layer to build. I went with **platform-authored starter drafts + AI regeneration on demand** because it matches the doctrine ("AI cannot invent rules" + "structure precedes intelligence"), but a one-line steer like *"the platform should ship a starting point I can edit"* vs *"I want to define my own templates"* vs *"the AI should write a first draft when I adopt"* would have removed the inference. For this prompt I'm confident — the platform-authored route is the right doctrine answer — but for future "should X have defaults" questions, naming **who authors the default** is the fastest path to the right architecture.

