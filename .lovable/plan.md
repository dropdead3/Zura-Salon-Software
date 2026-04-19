
## Wave 27 — Role-First Handbook OS (Master Build Plan)

The master build that fuses the role-first UX (cards, role-aware wizard) with the high-leverage additions (shared policies, acknowledgment tracking, state overlays, version diffs, AI gap detection, peer templates). Sequenced into 6 sub-waves so each ships clean — but planned holistically so the data model, types, and UI scaffolding all land consistent from day one.

### Architecture overview

```text
┌──────────────────────────────────────────────────────────────┐
│  Settings → Handbooks                                        │
│  ┌─ Wizard Tab ──────────────────────────────────────────┐   │
│  │  ROLE GRID (default)                                  │   │
│  │  ┌─Stylist─┐ ┌─Front Desk─┐ ┌─Manager─┐ ┌─+ Custom─┐  │   │
│  │  │ Status  │ │ Status     │ │ Status  │ │          │  │   │
│  │  │ Ack 8/12│ │ Ack 0/3    │ │ —       │ │          │  │   │
│  │  │[Config] │ │[Config]    │ │[Upload] │ │          │  │   │
│  │  │[Upload] │ │[Upload]    │ │         │ │          │  │   │
│  │  └─────────┘ └────────────┘ └─────────┘ └──────────┘  │   │
│  │  ───────────────────────────────────────────────────  │   │
│  │  Shared Policies (collapsed)   View all handbooks ↗   │   │
│  └────────────────────────────────────────────────────── ┘   │
│  ┌─ Documents Tab (legacy CRUD, untouched) ──────────────┐   │
│  └────────────────────────────────────────────────────── ┘   │
└──────────────────────────────────────────────────────────────┘
```

### Data model (single migration, ships Sub-Wave 1)

| Table | Change | Purpose |
|---|---|---|
| `org_handbooks` | ADD `primary_role text NULL` | Scope handbook to one role |
| `org_handbooks` | ADD `legacy_handbook_id uuid NULL` | Link wizard handbook → published `handbooks` row for unified ack |
| `org_policy_blocks` | NEW | Shared, canonical policies (PTO, code of conduct, etc.) |
| `org_handbook_block_refs` | NEW | M:N — which handbooks reference which blocks, with optional overlay text |
| `org_handbook_changelog` | NEW | Version diff entries: `version_id, change_type, section_key, summary, created_at` |

All tables: `organization_id` + RLS via `is_org_admin` (write) and `is_org_member` (read).

### Sub-wave sequencing

| Sub-wave | Scope | Why this order |
|---|---|---|
| **27.1 — Foundation** | Migration (all 5 schema changes), `useHandbooksByRole()`, `RoleHandbookGrid` + `RoleHandbookCard` (UI only, status from existing data), wizard role-lock | Unblocks every later sub-wave; ships visible value immediately |
| **27.2 — Acknowledgment unification** | Publish flow writes to legacy `handbooks` table via `legacy_handbook_id`; role cards display `8/12 acknowledged` | Closes the proof-of-receipt gap; reuses existing staff flow |
| **27.3 — Shared policy library** | Policies tab in Wizard; `org_policy_blocks` CRUD; block reference picker in Scope Builder; edit-once-propagate-everywhere with diff preview | Highest cross-role leverage; prevents policy drift |
| **27.4 — State overlay + compliance flags** | Section library declares `state_overlays`; org locations resolve required states; **Compliance** chip on each role card flagging missing state-required clauses | Real legal protection; uses existing `US_STATES` |
| **27.5 — Version diff + targeted re-ack** | `org_handbook_changelog` populated on publish; staff `MyHandbooks` shows "3 changes since you last acknowledged" with diff-only review | Closes the publish-update loop without 40-page re-reads |
| **27.6 — AI gap detection (Health surface)** | Per-handbook health score: section coverage, missing state clauses, internal contradictions, undefined references; returns 1 primary lever per handbook (silent if nothing material) | Layers cleanly once 27.1-27.5 give it content density |

### Files (full inventory)

**New — components**
- `src/components/dashboard/handbook/RoleHandbookGrid.tsx`
- `src/components/dashboard/handbook/RoleHandbookCard.tsx`
- `src/components/dashboard/handbook/CustomRoleDialog.tsx` (free-text role for non-standard titles)
- `src/components/dashboard/handbook/PolicyLibrary.tsx` (27.3)
- `src/components/dashboard/handbook/PolicyBlockEditor.tsx` (27.3)
- `src/components/dashboard/handbook/PolicyBlockPicker.tsx` (27.3 — used inside Scope Builder)
- `src/components/dashboard/handbook/ComplianceChip.tsx` (27.4)
- `src/components/dashboard/handbook/HandbookHealthCard.tsx` (27.6)
- `src/components/dashboard/handbook/ChangelogPanel.tsx` (27.5)

**New — hooks**
- `src/hooks/handbook/usePolicyBlocks.ts` (27.3)
- `src/hooks/handbook/useStateRequirements.ts` (27.4)
- `src/hooks/handbook/useHandbookChangelog.ts` (27.5)
- `src/hooks/handbook/useHandbookHealth.ts` (27.6)

**New — edge functions**
- `supabase/functions/handbook-publish/index.ts` (27.2 — wires wizard → legacy `handbooks` insert with versioning)
- `supabase/functions/handbook-health/index.ts` (27.6 — Lovable AI Gateway, gemini-2.5-flash, gap detection)

**New — migration**
- `supabase/migrations/<ts>_handbook_role_first_os.sql` — all 5 schema changes in one migration (atomic)

**Modified**
- `src/pages/dashboard/admin/HandbookDashboard.tsx` — Role grid is default; "View all handbooks" link reveals legacy flat list
- `src/pages/dashboard/admin/HandbookWizard.tsx` — pass `primaryRole`; add Health panel slot (27.6); changelog footer (27.5)
- `src/pages/dashboard/admin/Handbooks.tsx` — Documents tab accepts `?upload=role&role=stylist` prefill
- `src/components/dashboard/handbook/steps/OrgSetupStep.tsx` — role-lock when `primary_role` set
- `src/components/dashboard/handbook/steps/ScopeBuilderStep.tsx` — role-filtered defaults; embed `PolicyBlockPicker` (27.3)
- `src/components/dashboard/handbook/ApplicabilityMatrix.tsx` — `singleRole` prop collapses to one role × employment types
- `src/hooks/handbook/useHandbookData.ts` — `primary_role` support; `useHandbooksByRole()`; `useCreateHandbookForRole()`
- `src/pages/dashboard/MyHandbooks.tsx` — show "X changes since last ack" prompt (27.5)
- `src/lib/handbook/sectionLibrary.ts` — declare `default_roles` and `state_overlays` per section

### Role catalog logic

Source: `ROLE_OPTIONS` from `src/lib/handbook/brandTones.ts` (8 roles).
Display: All 8 by default; orgs can hide unused roles via "Manage roles" affordance.
Custom roles: free-text via `CustomRoleDialog`, persisted on `org_handbooks.primary_role`.
Cardinality: **1:1 enforced** — one handbook per role per org. Attempting to create a second prompts "Replace existing?" or "Open existing".

### Wizard role-awareness contract

When `primary_role` is set on a handbook:
- **Org Setup:** Role multi-select locks to that one role with copy *"Scoped to {role}. Manage other roles from the Handbooks dashboard."*
- **Scope Builder:** Section library smart-defaults filter to `default_roles.includes(role) || default_roles.length === 0`
- **Applicability Matrix:** Single role column; employment type columns become the variation axis
- **Wizard subtitle:** Shows role chip ("Stylist Handbook · Draft v3")

When `primary_role` is NULL (legacy multi-role): existing behavior unchanged — zero regression.

### Acknowledgment unification (27.2 detail)

Publishing a wizard handbook calls `handbook-publish` edge function which:
1. Writes wizard content as PDF or HTML blob to storage
2. Inserts row into legacy `handbooks` table with `visible_to_roles = [primary_role]`
3. Sets `org_handbooks.legacy_handbook_id` to that row's id
4. Inherits existing staff `MyHandbooks` ack flow with zero changes

Role card pulls ack count from `handbook_acknowledgments` joined via `legacy_handbook_id`.

### State overlay logic (27.4)

Org's `locations` table → resolve `state` codes → match against each section's `state_overlays`.
- Required-but-missing → red chip on role card: *"CA requires written meal-break policy"*
- Present but stale → amber chip: *"CA meal-break clause updated 2024-08; review"*
- All clear → no chip (silence is valid)

Uses existing `US_STATES` from `brandTones.ts`. Section library declares overlays per section.

### Health surface (27.6) — lever doctrine compliance

Per handbook returns at most **one primary lever** per the doctrine:
- Confidence threshold: only surface if material (e.g., legally required clause missing, not stylistic gaps)
- Silent if nothing material
- Logic expandable: clicking the lever shows what triggered it
- No redundant alerts across roles (deduplicate at org level)

Edge function uses Lovable AI Gateway (`google/gemini-2.5-flash` — balanced cost/precision for structured analysis).

### Verification gates (per sub-wave)

**27.1:** Role grid renders 8 cards + Custom; clicking Configure on empty card creates handbook with `primary_role`, lands in role-locked wizard.
**27.2:** Publishing a wizard handbook produces a row staff can acknowledge in `MyHandbooks`; role card shows live ack count.
**27.3:** Editing a policy block in the library updates every handbook that references it; orgs can fork a block per role.
**27.4:** Multi-state org sees state-specific compliance chips; single-state org sees only relevant flags; no chip when compliant.
**27.5:** Republishing a handbook generates a changelog; staff see "3 changes" not "re-acknowledge entire document."
**27.6:** Health surface returns one lever per handbook or stays silent; lever logic is expandable.

### Out of scope (explicit defers)

- **Cross-role diff view** (compare Stylist vs Apprentice side-by-side) → Wave 28+; serves enterprise multi-role only
- **Templates from peer orgs** (network-anonymized starting points) → Wave 32; needs published-handbook density first
- **PDF/print export** → Wave 28; ships with reader UI
- **E-signature integration** → Wave 30+; current ack flow is sufficient for compliance baseline
- **Multi-language handbooks** → not in roadmap; defer until owner demand surfaces

### Doctrine alignment checklist

- ✅ Tenant isolation: all 5 new tables scoped by `organization_id` with RLS via `is_org_admin`/`is_org_member`
- ✅ Lever doctrine: Health surface returns ≤1 primary lever, silent when not material
- ✅ Alert governance: no real-time alerts added; compliance chips are passive
- ✅ Persona scaling: solo operators see role grid (simple); multi-location see compliance + version diffs (advanced) — all via existing VisibilityGate where applicable
- ✅ Brand tokens: all UI uses `tokens.card`, `tokens.button.cardAction`, Termina for headers, Aeonik for body
- ✅ Privacy: ack counts use existing data — no monetary values to wrap in `BlurredAmount`
- ✅ AI governance: Health surface recommends only; never auto-edits handbook content (Recommend → owner approves)
- ✅ Phase alignment: this is Phase 1 structural visibility + Phase 2 advisory layer; no Phase 3 simulation overreach

### Prompt feedback

Decisive — *"build it all"* + *"focused and holistic"* gave me permission to plan the full arc instead of fragmenting it across 6 separate planning rounds. That single phrase saved meaningful coordination overhead and let me sequence the data model atomically (one migration vs five).

To level up: **for "build it all" prompts, name the *demo cadence* you want.** I chose 6 sub-waves with each individually shippable (so you can ship 27.1 in days, 27.6 in weeks). But you could equally want one massive merge ("ship all 6 together — I want a single big reveal") or aggressive parallelization ("split into 3 tracks — UI, data, AI — and run concurrently"). A one-liner like *"ship in sub-waves, one per week"* would have eliminated my cadence inference. Pattern: **for mega-feature build prompts, name the shipping rhythm (incremental · all-at-once · parallel tracks) — it determines whether the plan is sequential, atomic, or branched.**
