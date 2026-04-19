
## Wave 28.9 — Conflict Center & Version History UI

Surface the structural conflict + version data already captured by Policy OS into operator-facing tools. 28.6 detects conflicts; 28.9 makes them resolvable. Versions are written on every variant approval; 28.9 makes them browsable.

### Build sequence

| Step | Scope | Files |
|---|---|---|
| **1. Conflict Center page** | New `/dashboard/admin/policy/conflicts` route. Lists every `PolicySurfaceConflict` from `usePolicyData` grouped by surface, with category + policy titles + a "Resolve" CTA that deep-links to `PolicySurfaceMappingsEditor` filtered to that surface. Empty state when zero conflicts (visibility contract). | `src/pages/dashboard/admin/PolicyConflictCenter.tsx` |
| **2. Conflict resolution hook** | `useResolvePolicyConflict.ts` — mutation that disables a surface mapping (sets `is_active=false` on `policy_surface_mappings`) with audit trail. Invalidates `usePolicyData`. | New hook |
| **3. Conflict row component** | `ConflictRow.tsx` — one row per conflict: surface badge, category badge, list of conflicting policies (clickable → policy configurator), "Disable mapping" action per policy. | `src/components/dashboard/policy/conflicts/ConflictRow.tsx` |
| **4. Version History hook** | `usePolicyVersionHistory(policyId)` — fetches `policy_versions` + nested `policy_variants` ordered by `version_number desc`. Includes diff metadata (changed_at, changed_by, change_summary). | `src/hooks/policy/usePolicyVersionHistory.ts` |
| **5. Version History panel** | `PolicyVersionHistoryPanel.tsx` — slide-out (Sheet) opened from `PolicyConfiguratorPanel` "View history" button. Lists versions newest-first. Each entry: version number, timestamp, author, "View diff" expand showing variant body_md side-by-side with previous version. | `src/components/dashboard/policy/PolicyVersionHistoryPanel.tsx` + `VersionDiffView.tsx` |
| **6. Diff renderer** | `VersionDiffView.tsx` — uses simple line-based diff (added/removed/unchanged) between two `body_md` strings. No external diff lib unless trivially small. Color-coded with semantic tokens (success/destructive at low opacity). | New component |
| **7. Configurator integration** | `PolicyConfiguratorPanel` gains "Version History" button (next to "View public page") → opens panel. Conflict banner in dashboard gains "Open Conflict Center →" link. | Edited |
| **8. Route + nav** | Register `/dashboard/admin/policy/conflicts` in `App.tsx`. Add to Policy OS sub-nav if one exists; otherwise reachable via conflict banner CTA only. | Edited |

### Doctrine checks
- ✅ Visibility contract: Conflict Center silent when zero conflicts; Version History empty until first version exists
- ✅ Tenant isolation: all queries org-scoped via existing RLS
- ✅ Single source of truth: diff reads `policy_variants.body_md` directly — no copy
- ✅ Recommend → Approve → Execute: conflict resolution requires explicit "Disable mapping" click, never auto-resolved
- ✅ Audit: mapping disable writes to existing audit trail (or adds entry to `policy_change_log` if present)
- ✅ UI tokens, Termina headers, font-medium max, no hype copy

### Out of scope
- Side-by-side variant compare across **audiences** (internal vs client) — separate wave
- Restore/revert to previous version — needs approval workflow design (Phase 3)
- Conflict auto-suggestion ("merge these two policies") — AI feature, deferred
- Real-time conflict notifications — uses existing alert governance, not in this wave

After 28.9: **Wave 28.10 — Policy Acknowledgments** (client signature capture on Policy Center).
