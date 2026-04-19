

## Wave 12 audit — services configurator & settings (full sweep)

User asked for a full re-analysis with explicit tenant-isolation lens. Verified Waves 8–11 and ran a top-down pass. Found **2 P0**, **4 P1**, **3 P2**. Two correct prior-wave invalidations of false-positives (pricing tables) need reversing — `service_level_prices` is real, has 385 rows, and its UI is live.

---

### P0 — `useCreateService` / `useUpdateService` in `useBookingSystem.ts` are org-blind, name-collide with the canonical hooks, and bypass all defaults

`useBookingSystem.ts:380-441` exports `useCreateService` and `useUpdateService` against the `services` table:
- **No `organization_id` set** on insert. RLS protects writes (`is_org_admin(..., organization_id)` requires org match), so an attempted insert via this hook fails with an opaque RLS error — but if a future caller passes one explicitly the hook silently allows cross-org writes.
- **Same name as the canonical hooks** in `useServicesData.ts`. Auto-imports can grab the wrong one; current grep confirms no callsite uses these duplicates, but they remain a footgun.
- **Invalidates `['services']`** — a key nothing else uses (the canonical key is `['services-data']`), so even if these mutations succeed they don't refresh the UI.

**Fix:** Delete both functions outright. Zero callsites; the file is otherwise still used (`useServices` for email flows). ~62 lines removed.

### P0 — `service_category_colors` policies still allow `organization_id IS NULL` bypass on SELECT/UPDATE

```
SELECT  USING ((organization_id IS NULL) OR is_org_member(...) OR is_platform_user(...))
UPDATE  USING ((organization_id IS NULL) OR is_org_admin(...)  OR is_platform_user(...))
```

The legacy NULL row was backfilled in Wave 11 (verified: 0 NULL rows now) and the column is `NOT NULL`. The bypass clause is dead surface area — but if any future migration accidentally inserts a NULL row, every authenticated user across every org gets read/write to it. Doctrine: *"USING (true) strictly prohibited"* extends to permissive predicates with no tenant check.

**Fix:** Migration drops + recreates SELECT/UPDATE policies without the `organization_id IS NULL` branch. INSERT/DELETE already correctly require org admin.

### P1 — `useReorderCategories` in-flight write storm + race window

`useServiceCategoryColors.ts:115-134` issues N sequential `UPDATE … WHERE id = $1 AND organization_id = $2` writes inside a single `mutationFn`. If two operators reorder simultaneously, the last write wins per row but the global ordering can be inconsistent (e.g. operator A puts row 5 at position 1 while operator B puts row 7 at position 1 — both succeed).

**Fix:** Promote to a single `RPC reorder_service_categories(_org_id uuid, _ordered_ids uuid[])` security-definer function that does the whole reorder in one statement (`UPDATE … SET display_order = WITH ORDINALITY`). Defers to a future wave but worth flagging — for now, document as known limitation and keep sequential.

**Recommended this wave:** Skip the RPC; add a `staleTime: 0` + `refetchOnWindowFocus` for the colors query so concurrent operators see the canonical order on tab focus. Cheap mitigation.

### P1 — `BulkEditServicesDialog` per-id update path doesn't validate price/duration bounds

`BulkEditServicesDialog.tsx:122-145` accepts arbitrary `parseFloat(priceValue)` and writes `price` and `duration_minutes` to the bulk patch without enforcing the same bounds the editor enforces (Wave 9: price ≥ 0, duration ≥ 5). A negative percent or "set to -10" silently writes negative prices for every selected service.

**Fix:** Add the same `checkFloat`/`checkInt` validation block, gate `canApply`, and clamp computed values to `Math.max(0, …)` for price and `Math.max(5, …)` for duration.

### P1 — `useServiceLevelPrices` / `useServiceLocationPrices` / `useStylistPriceOverrides` queries aren't org-scoped, and `useServiceLevelPrices` cache key collides across orgs

All three per-service hooks query by `serviceId` only. `service_id` is globally unique so RLS catches cross-tenant reads, but the React Query cache key is `['service-level-prices', serviceId]` — when a super-admin switches from org A to org B and opens the same service editor for a service that exists in both orgs (e.g. a templated "Men's Cut" UUID match is impossible but the cache pattern is fragile), defense-in-depth says scope the key.

**Fix:** Add `organizationId` to query key and `.eq('organization_id', orgId)` filter on all three reads.

### P1 — `ServicesSettingsContent` reorder mutation drops org guard when `effectiveOrganization` is null

Lines 257-271 pass `organizationId: effectiveOrganization?.id` (not the `resolvedOrgId` fallback used for everything else). For a platform user owning an org, `effectiveOrganization` can be undefined and reorder writes lose the defense-in-depth filter.

**Fix:** Use `resolvedOrgId` (the same fallback chain as `useArchivedServices`, `useServiceFormCounts`, etc.).

### P2 — `useServiceFormRequirements` org-wide list inner-joins on `services` but mutations don't invalidate the org-scoped key

`useServiceFormRequirements.ts:99-106, 141-150, 165-174, 198-208` invalidate `['service-form-requirements']` (matches both org-scoped and per-service variants via prefix match). This is correct but inefficient — every mutation refetches every variant. Low-priority, defer.

**Fix (defer):** Scope to `['service-form-requirements', orgId]` once `orgId` is plumbed into mutations.

### P2 — `useServiceCategories` (line 329, `useServicesData.ts`) still org-blind

Returns distinct categories from `services` with no `.eq('organization_id', orgId)` filter. RLS-protected, but identical to the doctrine violation already flagged on `useService(serviceId)`. Caller usage is sparse; verify and add filter or document as defense-in-depth gap.

**Fix:** Add `organizationId` arg + filter. ~5 lines.

### P2 — `useServiceSeasonalAdjustments` query key org-blind + uses `service_id IS NULL` global rows without scoping

`useServiceSeasonalAdjustments.ts:19-39` fetches global (`service_id IS NULL`) adjustments alongside per-service ones. RLS scopes to org, but the cache key is `['service-seasonal-adjustments', serviceId]` — global rows are joined into multiple per-service caches with no org dimension.

**Fix:** Add `organizationId` to query key. Defer if cache-correctness only.

---

### Wave 9 / Wave 10 false-positive corrections

**Wave 9 P0 — "level_pricing / stylist_service_overrides / service_location_pricing have NO RLS"**
- Wave 10 marked these "tables don't exist." **Wrong.** The *actual* table names are `service_level_prices`, `service_stylist_price_overrides`, `service_location_prices`. They exist, have 385 / 0 / 0 rows respectively, are RLS-enabled, and have full 4-policy org-scoped sets (verified). The pricing UI (`LevelPricingContent`, `StylistOverridesContent`, `LocationPricingContent`) is live and functional.
- **Action:** No migration needed; correct the audit log.

### Verified clean (no action)

- `services` RLS — org-scoped on all 4 ops ✓
- `service_form_requirements` RLS — parent-joined org check ✓
- `service_audit_log` RLS — admin SELECT, member INSERT ✓
- `service_addons`, `service_addon_assignments` RLS — org-scoped ✓
- `service_seasonal_adjustments` RLS — org-scoped ✓
- `service_email_flows` RLS — org-scoped ✓
- `service_level_prices`, `service_location_prices`, `service_stylist_price_overrides`, `service_price_recommendations` RLS — all org-scoped ✓
- 0 services / 0 category-colors with NULL `organization_id` ✓
- 0 cross-org employee↔service stylist overrides ✓
- Editor `validate()` covers 12 numeric fields + hotkey ✓
- Search predicate covers name + online_name + description + pos_hotkey ✓
- Public-booking inline form gating end-to-end ✓
- Editor dirty-state interceptor mounted ✓

### Out of scope / explicit defer

- Reorder RPC consolidation (CRDT-class problem; needs its own wave)
- `useServiceFormRequirements` mutation key precision (cosmetic perf)
- `useServiceCategories` org filter (defense-in-depth, RLS-safe today)
- `useServiceSeasonalAdjustments` cache-key dimension (cosmetic)

### Files touched

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | Drop + recreate `service_category_colors` SELECT/UPDATE policies without NULL bypass |
| `src/hooks/useBookingSystem.ts` | Delete dead `useCreateService` / `useUpdateService` (lines 379-441) |
| `src/hooks/useServiceLevelPricing.ts` | Add `organizationId` to query key + `.eq('organization_id', orgId)` filter on `useServiceLevelPrices` and `useStylistPriceOverrides` |
| `src/hooks/useServiceLocationPricing.ts` | Same on `useServiceLocationPrices` |
| `src/components/dashboard/settings/ServicesSettingsContent.tsx` | Reorder mutation uses `resolvedOrgId` instead of `effectiveOrganization?.id` (2 spots, lines 258, 265) |
| `src/components/dashboard/settings/BulkEditServicesDialog.tsx` | Numeric validation block + clamp (price ≥ 0, duration ≥ 5) |

### Recommended cutoff

- **Ship now:** Both P0s + all four P1s. ~80 lines net deletion + 1 small migration.
- **Defer:** Three P2s + reorder RPC.

### Verification

1. Grep `useCreateService.*useBookingSystem` → zero hits (confirmed).
2. As any user, attempt `INSERT INTO service_category_colors (organization_id) VALUES (NULL)` → RLS denies (no policy matches).
3. Open service editor → Level Pricing tab renders with prices; switch orgs → query key changes, cache invalidates.
4. Bulk edit, set price percent to -200% → "Apply" disabled with inline error.
5. Reorder categories as platform user without `effectiveOrganization` → write succeeds with `resolvedOrgId` guard, position persists.

### Prompt feedback

Strong prompt — *"ensure no bleed or pollination into other organizations"* explicitly named the lens, which made me lead with the RLS verification table and check policies on every adjacent table (caught the `service_category_colors` NULL bypass nobody had flagged in 4 prior waves). The phrase "find any gaps and bugs" gave permission to widen scope beyond pure tenant isolation, which surfaced the `BulkEditServicesDialog` validation gap.

To level up: **state the prior-wave-correction posture up front.** I caught two Wave 9/10 false-positives (the pricing tables that "don't exist" actually do, just under different names) only because I queried `information_schema` directly. If you'd added *"verify and correct prior wave findings as part of the sweep,"* I'd have led the response with a "Wave 9/10 corrections" block instead of burying it mid-plan. Pattern: **explicit reconciliation directive = wave-over-wave audit hygiene.**

