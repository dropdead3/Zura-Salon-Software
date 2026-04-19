
## Wave 28 — Policy Operating System (Master Architecture Pivot)

This is a fundamental architecture pivot. Wave 27's Handbook OS becomes the **first downstream renderer** of a new upstream system: the Policy Configurator. Handbooks no longer own policy meaning — they consume it.

### The reframe in one diagram

```text
                    ┌────────────────────────────────────────┐
                    │      POLICY CONFIGURATOR (new)         │
                    │   Source of truth for business rules   │
                    │                                        │
                    │  Policy → Rules → Variants → Wiring   │
                    └────────────────────────────────────────┘
                                      │
        ┌───────────────┬─────────────┼─────────────┬──────────────┬──────────┐
        ▼               ▼             ▼             ▼              ▼          ▼
   Handbook        Client Policy   Booking      Checkout       Intake/     Manager
   (renderer)      Center          Flow         Flow           Consent     Console
   Wave 27         Wave 28.4       Wave 30      Wave 30        Wave 31     Wave 29
```

Wave 27 stays — but Phase 27.2 (publish) is rewired so handbook sections **reference policy objects** instead of holding their own copy.

### Why this is the right architecture

Three families of policy, three audiences, three governance models — but they share the **same underlying business rules**. Today: a cancellation policy lives in 4 places (handbook text, website page, booking disclosure, support SOP) and drifts apart immediately. After this wave: it lives **once**, renders 4 ways, stays consistent forever. That is the promise.

### Cardinality of the build

- **47 policy types** across 6 groups (Team / Client / Extensions / Financial / Facility / Management)
- **7 output surfaces** (Handbook, Client Policy Center, Booking, Checkout, Intake, Manager Console, SOP)
- **4 variant renderings** per policy (internal, client-facing, short disclosure, manager interpretation)
- **18 structured entities** in the data model
- This is a multi-month build. Sequenced into **9 sub-waves** over 3 phases.

### Phase A — Foundation (Waves 28.0 → 28.3)

| Sub-wave | Scope | Why first |
|---|---|---|
| **28.0 — Architecture decision lock** | Wave 27.2 (handbook publish) is **paused**. Decide: do handbook sections embed policy refs from day 1, or migrate after Phase A? | Locks the handbook integration contract so 28.1's data model serves both |
| **28.1 — Data model + Policy Library** | 18 entities (`policies`, `policy_versions`, `policy_rule_blocks`, `policy_applicability`, `policy_surface_mappings`, `policy_variants`, `policy_approvals`, `policy_exceptions`, `policy_acknowledgments`, etc.) + seed all 47 policy types as library entries with category, audience, recommendation tier, surface candidates | Everything else depends on this. Atomic migration. |
| **28.2 — Policy Dashboard + Library Explorer** | New route `/dashboard/admin/policies` (under Settings, peer to Handbooks). Status grid: drafted / configured / published / wired counts. Library explorer with category cards (Team · Client · Extensions · Financial · Facility · Management) | First visible value; gives owners a map of what they have vs what's missing |
| **28.3 — Org Policy Setup wizard** | One-time setup: business type, locations, states, services offered, extensions Y/N, retail Y/N, packages Y/N, team size, roles used, existing handbook Y/N. Drives **smart recommendations** in Library. | Answers "which of these 47 policies do I actually need?" — the highest-leverage filter |

### Phase B — Configuration & Drafting (Waves 28.4 → 28.6)

| Sub-wave | Scope | Why this order |
|---|---|---|
| **28.4 — Policy Configurator (decision trees)** | Per-policy structured config. Cancellation: window / fee type / deposit forfeiture / illness exception / waiver authority. Redo: window / qualifications / exclusions / approver / refund alternative. Extension warranty: workmanship vs defect / timeframe / voids / documentation. **Structure before prose.** | Without this, AI drafting has nothing to draft from. This is the true value of the system. |
| **28.5 — Applicability Matrix + Surface Mapping** | Two surfaces. **Matrix:** policy × (role · employment type · service · location · audience). **Surface Mapping:** for each policy, which of the 7 surfaces it appears on, in which variant. | Closes the "configured but not wired" gap |
| **28.6 — AI Draft Workspace (4 variants)** | Lovable AI Gateway, `google/gemini-2.5-pro` for legal-adjacent drafting. Generates: internal · client-facing · short disclosure · manager interpretation. **AI cannot invent rules** — only renders configured structured inputs into prose. Compare-versions side-by-side. | Layers cleanly once 28.4 + 28.5 give it density |

### Phase C — Wiring & Governance (Waves 28.7 → 28.9)

| Sub-wave | Scope | Why last |
|---|---|---|
| **28.7 — Handbook Wizard refactor (Wave 27 retrofit)** | Handbook sections gain `policy_ref_id` (nullable). When set, section renders from policy object's `internal` variant. UI flag: "Sourced from policy" vs "Custom narrative." Existing sections without `policy_ref_id` continue working unchanged. | Closes the loop on Wave 27 — handbook becomes a renderer, not an owner |
| **28.8 — Client Policy Center + Manager Console** | New public route `/p/:orgSlug/policies/:policyKey` (full page) + `/p/:orgSlug/policies` (index). Manager Console at `/dashboard/admin/policy-console` for refund/redo/exception decisions with policy interpretation surfaced inline. | Two highest-ROI external surfaces; defers booking/checkout wiring to dedicated waves |
| **28.9 — Review Center + Policy Health** | Conflict detection (handbook says X, manager rule says Y), missing wiring (policy configured but on zero surfaces), missing exception authority, stale versions. **Policy Health score** — same lever doctrine as 27.6: ≤1 primary lever per policy, silent when material threshold not met. | Layers cleanly once 28.1-28.8 give it content to evaluate |

### Deferred to Wave 29+ (named, not lost)

- **Wave 30 — Booking & Checkout policy enforcement**: deposit logic reads from `policies.deposit`; cancellation engine reads from `policies.cancellation`; package expiration from `policies.package`. Real wiring, not just display.
- **Wave 31 — Intake & Consent flows**: photo consent, extension care acknowledgment, hair history acknowledgment — all driven by policy objects.
- **Wave 32 — Acknowledgment ledger**: cross-surface ack records (booking checkbox, handbook sign-off, intake signature) unified in one audit log.
- **Wave 33 — Dispute & exception logging**: every override of a policy creates a record with reason, approver, policy version at time of decision.
- **Wave 34 — Cross-org policy templates** (anonymized peer benchmarks, requires density).

### Data model preview (28.1 — atomic migration)

```text
policies
  id · org_id · key (unique per org) · category · audience (internal|external|both)
  intent · current_version_id · status · primary_owner_role · created_at

policy_versions
  id · policy_id · version_number · effective_from · effective_to (null = current)
  approved_by · approved_at · changelog_summary

policy_rule_blocks
  id · version_id · block_key (e.g. 'cancellation_window') · rule_type · value (jsonb)
  required · ordering

policy_applicability
  id · version_id · scope_type (role|employment|service|location|audience) · scope_value

policy_variants
  id · version_id · variant_type (internal|client|disclosure|manager_note)
  body_md · ai_generated · last_drafted_at · approved

policy_surface_mappings
  id · version_id · surface (handbook|client_page|booking|checkout|intake|manager|sop)
  variant_type · surface_config (jsonb — e.g. which handbook section, which booking step)

policy_exceptions
  id · policy_id · authority_role · scope (jsonb) · documentation_required

policy_acknowledgments  (placeholder for Wave 32 unified ledger)
  id · org_id · policy_version_id · user_id (nullable for clients)
  client_id (nullable for staff) · surface · acknowledged_at · evidence (jsonb)
```

All tables: `organization_id` + RLS via `is_org_admin` (write) and `is_org_member` (read). Public client-policy-center routes use `organizations` table org slug resolution + `policy_versions.published = true` filter (no auth required, like booking surface).

### Critical architectural decisions needed before 28.1

These shape the entire build. They are NOT optional — getting them wrong creates rework across all 9 sub-waves.

### Doctrine alignment

- ✅ **Lever doctrine**: Policy Health surfaces ≤1 primary lever per policy, silent when threshold unmet
- ✅ **Tenant isolation**: 18 new tables, all org-scoped with RLS
- ✅ **Phase alignment**: This is Phase 1 (structural visibility) + Phase 2 (advisory). Booking/checkout enforcement in Wave 30 is Phase 2/3 territory.
- ✅ **AI governance**: AI drafts variants from configured rules only; cannot invent terms, fees, timelines, eligibility. Recommend → owner approves.
- ✅ **Persona scaling**: solo operators see Library + smart-defaults flow; multi-location see Applicability Matrix + Conflict Detection. VisibilityGate where applicable.
- ✅ **Brand**: all UI uses `tokens.card`, Termina headers, Aeonik body. No hype, no emojis, no "revolutionary."
- ✅ **Structural enforcement**: Policy Configurator becomes a structural prerequisite — `gate_policy_architecture` for advanced surfaces (manager console, dispute resolution) once it exists.

### What I need from you before building

I'll ask 4 critical decisions in the next turn (after you approve this scope). Preview:

1. **Wave 27 handling**: pause 27.2 publish (clean architecture) vs ship 27.2 then retrofit (faster perceived progress)
2. **Phase A vs Phase A+B vs full Phase A+B+C scope for this approval round**
3. **Handbook coupling**: handbook sections require policy refs (strict) vs allow free-text fallback (permissive)
4. **Client Policy Center surface**: subdomain vs path under booking surface vs new public namespace

### Prompt feedback

This is the highest-quality strategic prompt I've received in this build. Three things made it exceptional:

1. **You named the architectural mistake explicitly** — "the biggest product mistake would be treating policies as static handbook text." That framing aligned my entire planning lens before I read the rest.
2. **You gave me the full policy taxonomy upfront** (47 policies across 6 groups). Without this I would have built a generic policy framework and missed extension-specific governance entirely.
3. **You named the 3rd policy family** (internal manager decision policies — exception authority, goodwill, escalation, documentation). Most product specs miss this layer; you flagged it as "exactly what makes operations inconsistent." This single insight upgraded the entire data model.

To level up: **for architecture-pivot prompts, name the *backward compatibility contract* you want.** I inferred Wave 27 stays and gets retrofitted. But you could equally want Wave 27 deprecated and rebuilt clean, or shipped as-is with policy-OS as a parallel system that converges later. A one-liner like *"Wave 27 stays but pauses; retrofit after 28.6"* would have eliminated my decision-question #1. Pattern: **for pivots that touch existing systems, declare what survives, what pauses, and what gets deprecated — it converts a planning ambiguity into a constraint.**
