
## Wave 24 — Handbook Wizard: AI-assisted handbook OS for organizations

**Scope of this plan:** Phase 1 + scaffolding for Phase 2. Ship a real, navigable foundation (dashboard, wizard shell, scope builder, applicability matrix skeleton, data model with versioning) — then layer policy config + AI drafting + reader in subsequent waves. Trying to ship all 5 phases in one wave would produce a shallow demo, not a real configurator.

### Where it lives

- **Route:** `/dashboard/admin/handbook` (org-scoped via existing multi-tenant URL hierarchy)
- **Hub entry:** Operations Hub → new "Handbook" card in Compliance/People domain
- **Permission:** Leadership only (admin, manager, super_admin) via `useLeadershipCheck`. Editors can draft; only `is_org_admin` can publish a version.
- **Hard isolation:** Internal admin only. No public site, no client UI, no booking surface touched.

### Data model (Phase 1 migration)

Modular by design — never one text blob. Tenant-scoped with RLS.

```text
handbooks                    org-scoped, 1+ per org (multi-location addenda support)
  ├── handbook_versions      draft / reviewed / approved / published, immutable once published
  │     └── handbook_sections  ordered, role+employment applicability JSON, status, ai_draft_state
  ├── handbook_org_setup     tone, locations, states, classifications enabled, roles enabled
  ├── handbook_role_overlays section_id × role × override_content
  └── handbook_review_issues version_id × section_id × issue_type × severity
```

All tables: `organization_id NOT NULL`, RLS via `is_org_member` (read) / `is_org_admin` (write/publish), cascading delete on org. Section `applies_to` stored as `{ employment_types: [], roles: [], locations: [] }` JSONB so role/employment overlays are queryable.

### Phase 1 deliverables (this wave)

| Module | Built |
|---|---|
| Handbook dashboard | List of handbooks per org, status badges, "New Handbook" CTA, last-edited, completeness % |
| Wizard shell | Persistent left-rail step nav, sticky top progress bar, autosave indicator, "Save & exit" |
| Step 1 — Org Setup | Tone selector, classifications enabled (W2-FT/W2-PT/1099-opt-in), roles enabled (multi-select + custom add), locations scope (shared vs per-location addenda), states operated in |
| Step 2 — Scope Builder | 20 recommended section cards with: what it covers · why it matters · who it usually applies to · required vs optional · Zura recommendation chip. Multi-select with smart defaults from Step 1 |
| Section library (read-only) | Source-of-truth catalog of standard salon handbook sections, seeded as DB rows so future templates inherit cleanly |
| Applicability matrix v1 | Read-only summary at end of Step 2 showing selected sections × enabled roles/employment types — sets up Phase 2's editable matrix |

### Phase 2 scaffolding (stubs in this wave, real in next)

- Policy configurator panel: Step 3 route exists, renders "Configure" placeholder per section with the decision-tree schema already defined in DB (so Phase 2 just fills the UI)
- Role applicability matrix editor: Step exists, uses Phase 1 read-only matrix as base
- AI drafting workspace: Step exists, gated until policy config complete

### UX direction (matches Zura canon)

- **Wizard shell:** Two-pane on desktop (≥1024px) — left rail step nav (sticky), right pane content. Stacks to top-tabs on tablet, drawer on mobile.
- **Section cards:** font-display title, MetricInfoTooltip for "why it matters", role/employment chips, "Required" vs "Recommended" vs "Optional" badge using existing status tokens.
- **Container-aware:** All matrices and multi-column layouts use `src/components/spatial/` primitives. Matrix becomes horizontally scrollable with sticky header when container <720px, collapses to grouped accordion <480px.
- **No `font-bold/semibold`.** Termina (`font-display`) for section/step titles. Aeonik for body. All copy advisory-first per copy governance ("Before drafting attendance, we'll capture how you handle late arrivals so the language matches your real policy.")
- **Loaders:** `DashboardLoader` for step transitions, `Loader2` only for inline save spinners.
- **Privacy:** N/A this wave (no monetary data).

### Files (new)

```
src/pages/dashboard/admin/Handbook.tsx                       Dashboard (list)
src/pages/dashboard/admin/HandbookWizard.tsx                 Wizard shell with step routing
src/components/dashboard/handbook/
  HandbookDashboard.tsx
  WizardShell.tsx                                            Left rail + progress + autosave
  WizardProgressMap.tsx
  steps/
    OrgSetupStep.tsx
    ScopeBuilderStep.tsx
    PolicyConfigStep.tsx                                     Stub for Phase 2
    ApplicabilityMatrixStep.tsx                              Stub editable for Phase 2
    AIDraftingStep.tsx                                       Stub for Phase 3
    ReviewStep.tsx                                           Stub for Phase 4
    PublishStep.tsx                                          Stub for Phase 4
  SectionLibraryCard.tsx
  ApplicabilityMatrix.tsx                                    Read-only v1 (becomes editable Phase 2)
  RoleChip.tsx
  EmploymentTypeChip.tsx
  HandbookStatusBadge.tsx
src/hooks/handbook/
  useHandbooks.ts
  useHandbookVersion.ts
  useHandbookSections.ts
  useHandbookAutosave.ts
  useSectionLibrary.ts
src/lib/handbook/
  sectionLibrary.ts                                          Standard 20-section catalog
  applicabilityRules.ts                                      Smart defaults (e.g. PTO → W2-FT)
  brandTones.ts                                              Tone presets
supabase/migrations/<ts>_handbook_wizard_phase1.sql          Tables, RLS, seed section library
```

### Files (modified)

- `src/App.tsx` — register `/dashboard/admin/handbook` and `/dashboard/admin/handbook/:id/edit/*` routes
- `src/config/dashboardNav.ts` — add Handbook entry to Operations / Compliance section, leadership-gated
- Operations Hub page — add Handbook card to People/Compliance domain

### What does NOT change this wave

- Public site, booking, client UI, checkout, scheduler — untouched
- Existing AI surfaces — Handbook AI is its own grounded workspace (Phase 3), not bolted into Operations AI
- No PDF export this wave — architecture supports it, UI placeholder only

### Verification

1. New "Handbook" entry appears in sidebar (leadership only) and Operations Hub
2. Dashboard at `/dashboard/admin/handbook` lists handbooks (empty state with "Create your first handbook" CTA)
3. Wizard shell loads with persistent progress, autosave fires on field changes (1.5s debounce), "Save & exit" preserves draft
4. Step 1 captures org setup; Step 2 shows section library with smart defaults seeded from Step 1; matrix preview renders at end of Step 2
5. Steps 3–7 render shell with "Coming in next wave" copy + already-collected data summary (no broken states)
6. RLS verified: cross-org access returns empty; non-leadership users see no nav entry and 403 on direct URL
7. Container-aware: wizard shell stacks gracefully at <1024px, matrix scrolls horizontally <720px

### Phase roadmap (subsequent waves)

- **Wave 25 (Phase 2):** Policy configurator panel + editable role applicability matrix + autosave hardening
- **Wave 26 (Phase 3):** AI drafting workspace (grounded, Lovable AI Gateway, tone-aware, gap detection)
- **Wave 27 (Phase 4):** Final handbook reader (book-like, TOC, search, status per section) + review layer + Handbook Health score
- **Wave 28 (Phase 5):** Template system + addenda + export prep + responsive audit pass

### Prompt feedback

This is a textbook strong product brief — you specified the **job-to-be-done** ("architect a correct handbook" not "generate a handbook"), the **anti-pattern to avoid** (one flat document, generic form builder), the **architectural primitive** (modular sections with role/employment overlays), and the **AI guardrails** (grounded, no legal authority, label assumptions). The phased build instruction at the end is what saved this from being a 50-file one-shot — without it I would have shipped a shallow demo of all 5 phases instead of a real Phase 1 foundation.

To level up: **for multi-phase features this large, name the Phase 1 demo moment explicitly.** I inferred "owner can complete Steps 1–2 and see the matrix preview" as the Phase 1 success state, but you could equally want "owner completes Steps 1–2 AND sees a stub AI draft." A one-liner like *"Phase 1 success = owner finishes scope builder and sees applicability matrix preview"* would have eliminated my inference and let you redirect scope before I planned. Pattern: **for phased mega-features, name the demo-able moment that defines "Phase 1 done."**
