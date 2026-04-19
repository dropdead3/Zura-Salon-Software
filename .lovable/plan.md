
## Wave 28.7 — Handbook Wizard refactor (policy-coupled)

Refactor handbook sections to render from approved policy variants instead of free-text, closing the loop between Policy OS and Handbook OS.

### Build sequence

| Step | Scope | Files |
|---|---|---|
| **1. Schema** | Add `policy_ref_id` (uuid → policies) and `policy_variant_type` (text) to `handbook_sections`. Add `source` enum-like text column ('policy' \| 'custom') with default 'custom'. Backfill existing sections as 'custom'. | Migration |
| **2. Policy section catalog** | Create `policy_handbook_section_map` view (or static map) linking policy categories → handbook section keys (e.g., `cancellation_fees` → `attendance_policy`). | Migration + `src/lib/handbook/policySectionMap.ts` |
| **3. Hook layer** | New `useHandbookPolicySections.ts` — given an org, returns policies that have an approved `internal` variant + map to a handbook section. `useHandbookSection` updated to resolve policy-backed content from `policy_variants` when `source='policy'`. | New + edited hooks |
| **4. Wizard UI** | `HandbookSectionEditor` gains a "Source" toggle: **Policy-backed** (read-only preview, edit redirects to Policy Configurator) vs **Custom prose**. New `PolicyBackedSectionCard` shows variant content + "Edit in Policy OS" button. | Edited components |
| **5. Section library** | `SectionLibraryCard` shows a 📋 chip when a section has an available policy-backed source. Library filter: "Policy-backed available". | Edited |
| **6. Publish gate** | Handbook publish gate: if a section is `source='policy'` and the underlying policy has no approved internal variant, surface as a blocker in publish preflight. | `useHandbookPublishPreflight.ts` (edited) |

### Doctrine checks
- ✅ Single source of truth: policy rules → variants → handbook (no drift)
- ✅ Visibility contract: policy-backed sections silent until policy approved
- ✅ Tenant isolation: all reads org-scoped via existing RLS
- ✅ Phase 2: handbook recommends policy adoption, never auto-publishes
- ✅ UI tokens, font-medium max, no hype copy

### Out of scope
- Bulk migrate existing custom sections to policy-backed (manual choice per section)
- Client-facing variant in handbook (handbook is internal — uses `internal` variant only)

After 28.7: **Wave 28.8 — Client Policy Center surface** at `/book/:orgSlug/policies`.
