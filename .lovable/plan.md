

## Wave 11 audit — services configurator & settings

Verified Wave 10 shipped clean (`useServiceFormRequirements` org-arg + inner-join filter ✓, `NewBookingSheet` semantic tokens ✓). Found **2 P1**, **3 P2**, plus **1 regression from Wave 8** that needs re-shipping.

---

### Real gaps

**P1 (regression) — Search extension never actually shipped**
Wave 8 plan + summary both claimed `searchQuery` in `ServicesSettingsContent` was extended to `online_name`, `description`, `pos_hotkey`. Verified at `ServicesSettingsContent.tsx:433` — still only `s.name.toLowerCase().includes(q)`. Operators searching for the public-facing variant (e.g. "Premium" online vs. "Cut Lvl 3" internal) get zero results.
**Fix:** 1-line predicate change to a joined haystack.

**P1 — Legacy NULL-org category will silently fail to reorder**
DB has 1 `service_category_colors` row with `organization_id IS NULL`. `useReorderCategories` uses `.eq('organization_id', orgId)` — that row's `display_order` update will be a no-op, so dragging it leaves position desynced from `localOrder` until refetch. RLS UPDATE policy already allows the NULL-org bypass, so the safe fix is to backfill the legacy row, OR drop the org filter from the per-id update (the per-id WHERE + RLS is enough).
**Fix:** Backfill via migration: `UPDATE service_category_colors SET organization_id = (SELECT id FROM organizations LIMIT 1) WHERE organization_id IS NULL` — single legacy seed row, deterministic. Then add `NOT NULL` constraint to prevent regression.

**P2 — `data.client_id` is dead path on confirm**
`HostedBookingPage.tsx:215-217` reads `data.client_id` from the edge response — but `create-public-booking` never returns it (only `appointment_id`, `requires_deposit`, etc.). `pendingClientId` is set to `null` always, then **never read** anywhere. Pure dead state + dead destructure.
**Fix:** Either delete the state entirely (recommended — nothing reads it), or have the edge function return `client_id` if a future feature needs it. Recommend delete: 3 lines.

**P2 — Three "core" hooks still org-blind in `useServiceCategoryColors.ts`**
`useServiceCategoryColors` (main fetch, line 42), `useArchivedCategories` (line 256), and `useServicesByCategory` (in `useServicesData.ts:94` — no orgId arg). All four are protected by RLS today but violate the doctrine *"All queries filter by organization, include orgId in query keys, use enabled: !!orgId"*. Defense-in-depth + correct cache scoping (today both orgs would share a cache entry on session switch).
**Fix:** Add `organizationId?: string` arg with `useOrganizationContext` fallback, include in query key, `enabled: !!orgId`. ~6 lines per hook. Mirror exactly the Wave 9 pattern from `useAllServicesData`.

**P2 — `useArchivedServices` org filter applies but `enabled` gate missing**
`useServicesData.ts:357-379` — accepts `organizationId`, applies `.eq('organization_id', orgId)` conditionally, but no `enabled: !!orgId`. On first render with no org context, fires an unfiltered query (RLS-safe but wasteful + leaks into wrong cache key `[..., undefined]`).
**Fix:** Add `enabled: !!orgId`.

---

### Verified clean (no action)

- `service_form_requirements` RLS — all 4 policies parent-joined to `services` org ✓
- `services` RLS, hotkey unique index `idx_services_pos_hotkey_unique_per_org` ✓
- `service_audit_log` RLS — admin-scoped SELECT, member INSERT ✓
- 10 audit triggers active on `services` + `service_form_requirements` ✓
- Public-booking inline form gating end-to-end (modal, edge function validation, signature insertion) ✓
- `NewBookingSheet` semantic tokens ✓
- `useServiceFormRequirements` org-arg inner-join filter ✓

### Out of scope / explicit defer

- `useServices`/`useServicesByCategory` clones in `useBookingSystem.ts` — still deferred to a focused booking refactor (now 3 audit waves running).
- `service_form_requirements` has no `updated_at` column — audit trigger writes `previous_value`/`new_value` snapshots instead, so not needed.
- `useService(serviceId)` org-blind lookup-by-id — RLS-safe, lookup is single-row, defer.

### Wave 8 plan accuracy issue

Wave 8's "ship now" set claimed search-predicate extension was included; the migration shipped, the editor validation shipped, but the search predicate change did not. Audit log entry: **Wave 8 P2 search reopened as Wave 11 P1.**

### Files touched

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | Backfill NULL `organization_id` on `service_category_colors`; add NOT NULL |
| `src/components/dashboard/settings/ServicesSettingsContent.tsx` | Extend search predicate to name + online_name + description + pos_hotkey |
| `src/components/booking-surface/HostedBookingPage.tsx` | Delete `pendingClientId` state + unused `data.client_id` read |
| `src/hooks/useServiceCategoryColors.ts` | Org-scope `useServiceCategoryColors` + `useArchivedCategories` |
| `src/hooks/useServicesData.ts` | Org-scope `useServicesByCategory`; add `enabled: !!orgId` to `useArchivedServices` |

### Recommended cutoff

- **Ship now:** Both P1s (search regression + NULL backfill), all three P2s. ~25 lines + 1 small migration. Single wave.
- **Defer:** Booking-system rename (now flagged in 3 consecutive audits).

### Verification

1. Search "premium" in services settings → finds services where only `online_name` matches.
2. Drag the previously-NULL-org category → position persists across refresh.
3. Open booking, confirm without forms → no console error from missing `client_id`.
4. Open `useServiceCategoryColors` devtools → query key includes orgId; switching orgs invalidates.

### Prompt feedback

Strong prompt — same delta-audit framing kept scope tight. The implicit "Wave 10 shipped, what's left?" worked.

To level up: **flag plan-vs-ship discrepancies as a category.** I caught the search regression only by skimming the file; if you'd said *"verify each prior wave's claimed changes are present, flag drift"* I'd have led with a verification table column for "claimed shipped / actually shipped" instead of burying the regression in a P1 bullet. Pattern: **claim-vs-state diff = surfaces silent regressions waves later.**

