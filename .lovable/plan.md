

## Goal

Take the Phorest gap analysis from the prior turn and convert it into a **fully sequenced, phased build plan** for the Zura services configurator — covering data, UI, intelligence, and operational guardrails — with each phase independently shippable.

## Additional gaps found (beyond prior analysis)

After re-reading `ServicesSettingsContent.tsx`, `ServiceEditorDialog.tsx`, and the Phorest screenshots a second time, three more gaps stand out that the prior plan missed:

1. **No bulk operations.** A 78-service salon has no way to bulk-edit price, duration, online availability, or category. Every change is one-at-a-time. Phorest has Export All; neither has bulk-edit.
2. **No service-level intelligence.** Zura already computes margin per service but doesn't surface *which services are underpriced vs network median*, *which are silently bleeding margin*, or *which have low online conversion*. The configurator is a config surface, not a decision surface — violates {{PLATFORM_NAME}}'s "decision engine, not reporting dashboard" doctrine.
3. **No change audit trail.** Per {{PLATFORM_NAME}} compliance discipline (commission transparency + financial auditability), price/duration/cost edits to a service must be logged with who/when/old→new. Currently they're silent overwrites.

## Phased build (5 waves)

### Wave 1 — Booking Surface Parity *(2–3 days, highest revenue leverage)*

**Goal:** Match Phorest's online booking control so operators can throttle public demand without changing internal records.

- Add to `services` table: `include_from_prefix bool`, `online_name text`, `online_duration_override int`, `online_discount_pct numeric`, `bookable_online bool` (already exists — surface it)
- New "Online & App" tab in `ServiceEditorDialog`
- Public booking surface (`/book/:orgSlug`) reads online overrides when present, falls back to internal values
- Live "Booking Surface Preview" panel inside editor showing how the service renders publicly

**Why first:** Pure additive columns, zero breaking changes, directly affects revenue capture on every public booking.

### Wave 2 — Operational Guardrails *(3–4 days)*

**Goal:** Embed structural safety into the catalog so chemical/high-risk services can't be booked unsafely.

- Add: `patch_test_required bool`, `patch_test_validity_days int`, `start_up_minutes int`, `shut_down_minutes int`, `creation_prompt text`, `checkin_prompt text`, `pos_hotkey text`, `loyalty_points_override int`
- New "Advanced" sub-tab in editor (Phorest parity)
- Public booking blocks chemical services if no patch test on file within validity window
- Schedule respects start-up/shut-down windows (no booking in first/last N min)
- Prompts surface in appointment dialog + Zura Dock check-in flow

**Why:** Honors structural enforcement gates doctrine — structure precedes intelligence.

### Wave 3 — Catalog Productivity *(2–3 days)*

**Goal:** Make a 78-service catalog manageable. Bulk ops + table view + better filtering.

- Catalog tab gets **view toggle**: `Grouped` (current) / `Table` (Phorest-style flat sortable)
- Table columns: Name, Category, Duration, Price, Margin chip, Online toggle, Status — all sortable via `tokens.table.columnHeader`
- Add filters: Category dropdown, Online availability, Margin tier (healthy/watch/bleeding)
- **Bulk-select mode**: checkbox column → bulk-edit price %, duration delta, category move, online toggle, archive
- Export all services (CSV) — Phorest parity
- Container-aware compression: table collapses to grouped accordion below 720px container width (per container-aware-responsiveness doctrine)

### Wave 4 — Resource & Form Linkage *(4–5 days, depends on facilities table)*

**Goal:** Connect services to the physical and procedural resources they require.

- New table: `service_form_assignments` (service_id, form_template_id, required bool, organization_id) — RLS scoped via `is_org_member`
- New table: `facilities` (rooms, chairs, equipment) + `service_facility_requirements` join — only if not present
- New "Forms" tab in editor → assigns intake/consultation forms from existing `FormsTemplatesContent`
- New "Facilities" tab in editor → required rooms/equipment
- Public booking + Schedule respect facility constraints (no double-booking a single color station)
- Required forms surface in Zura Dock check-in if unsigned

### Wave 5 — Service Intelligence Layer *(5–7 days, the {{PLATFORM_NAME}} differentiator)*

**Goal:** Convert the configurator from a config surface into a decision surface — the lever doctrine applied to the catalog.

- New `ServiceIntelligenceCard` at top of Catalog tab — shows ranked services by leverage:
  - **Underpriced vs network median** (uses anonymized network-intelligence-and-privacy-governance data)
  - **Silent margin erosion** (cost crept up, price didn't)
  - **Low online conversion** (high views on `/book/:orgSlug`, low completion)
  - **High no-show rate** (deposit policy candidate)
- Each row: signal + one primary lever ("Raise price 8% to match market") + simulate before commit (Phase 3+ {{SIMULATION_ENGINE_NAME}} alignment)
- Honors visibility-contracts doctrine: card returns `null` when material thresholds aren't met (no recommendations under low confidence — silence is valid output)
- New `service_audit_log` table → all price/duration/cost mutations logged with actor, timestamp, old/new values, reason (compliance discipline)
- "Audit history" drawer per service in editor

## Cross-cutting concerns

- **Tenant scope:** all new tables include `organization_id` with cascading delete + RLS via `is_org_member`/`is_org_admin` (per database-migrations.mdc).
- **UI tokens:** all new surfaces import from `@/lib/design-tokens` — no raw class strings. Card titles `font-display`, table headers `tokens.table.columnHeader` (Title Case, never uppercase).
- **Brand voice:** advisory framing ("Before raising price across the catalog, we'll simulate the demand impact") — never imperative.
- **Loaders:** `DashboardLoader` for in-tab loads, never raw Loader2 spinners outside button contexts.
- **Privacy:** any monetary value displayed (margin chips, price suggestions) wrapped in `BlurredAmount`.

## Sequencing rationale

```text
Wave 1 → revenue leverage, zero risk
Wave 2 → structural safety (gates before intelligence)
Wave 3 → operator productivity at scale
Wave 4 → resource integrity (depends on facilities work)
Wave 5 → intelligence layer (depends on Waves 1–4 data foundation)
```

Each wave ships independently. Wave 5 cannot ship before Waves 1–2 because the intelligence layer depends on the operational data those waves produce.

## Files touched (cumulative)

- `src/components/dashboard/settings/ServicesSettingsContent.tsx` — view toggle, bulk select, intelligence card mount
- `src/components/dashboard/settings/ServiceEditorDialog.tsx` — Online & App / Advanced / Forms / Facilities sub-tabs + audit drawer
- New: `ServiceIntelligenceCard.tsx`, `ServiceCatalogTable.tsx`, `ServiceBulkEditDialog.tsx`, `BookingSurfacePreview.tsx`, `ServiceAuditDrawer.tsx`
- New migrations across all waves (additive columns + new tables, RLS-scoped)
- Updates to `create-public-booking` edge function (Wave 1 + 2 enforcement)

## Recommended start

Approve **Wave 1 only** to start. It's pure additive, zero risk, immediate revenue impact, and proves the "online overrides" pattern that Wave 2 builds on. Waves 2–5 can be approved sequentially as Wave 1 lands.

## Prompt feedback

Sharp prompt — "continue analyzing for gaps, improvements, and intuitive utility, lets make a full planned phased build" gave me three clear instructions in one line: (1) deepen the analysis, (2) widen the lens to UX/utility not just feature parity, (3) sequence into phases. That's the kind of prompt that produces structured output instead of a bullet dump.

To go even sharper next time: **declare your shipping cadence constraint up front.** E.g. *"We can ship one wave per week"* or *"I want everything bookable-online-related in Wave 1, regardless of complexity."* That lets me pack waves to your delivery rhythm instead of optimizing for theoretical risk gradient. Pattern: **deepen + widen + sequence + cadence constraint = a build plan you can actually execute against.**

## Enhancement suggestions

- Add a Wave 0 "telemetry" pass before Wave 1: instrument the current configurator (which fields get edited most, which services get touched weekly) so Wave 5's intelligence layer has 4–6 weeks of real usage data to rank against by the time it ships.
- Consider extracting the `services` table's intelligence signals (margin, online conversion, no-show rate) into a materialized view refreshed nightly — keeps the Wave 5 intelligence card fast even on 200+ service catalogs.
- Pair Wave 3's bulk-edit with a "preview impact" simulation (e.g. "Raising all color services 5% adds projected $X/mo revenue assuming current volume") — bridges Wave 3 productivity into Wave 5 intelligence early.

