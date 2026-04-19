

## Wave 9 audit — services configurator & settings

Assuming Waves 1–8 shipped clean (verified: `services` RLS hardened, hotkey unique index in place, category cascade org-scoped, hooks deduped). Found **2 P0**, **3 P1**, **3 P2**. The two P0s are both tenant-isolation leaks on adjacent tables that Wave 8 didn't touch.

---

### P0 — `service_form_requirements` RLS is wide open

```
SELECT policy: "Anyone can read service form requirements" — qual: true
INSERT/UPDATE/DELETE: gated by is_coach_or_admin(auth.uid()) — no org check
```

Two problems:
1. **SELECT is `USING (true)`** — any authenticated user (including from any other org) reads every form linkage in the system. Direct doctrine violation: *"USING (true) strictly prohibited."*
2. **Mutations check `is_coach_or_admin` but not org membership** — a coach in org A can attach/detach a form requirement to a service in org B (the row's `service_id` is unconstrained). Combined with the now-properly-scoped `services` table, this is the only remaining backdoor for cross-org mutations on the catalog.

**Fix:** Replace all four policies with `EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND public.is_org_member(...))` for SELECT and `is_org_admin(...)` for write. Add platform-user bypass.

### P0 — `level_pricing`, `stylist_service_overrides`, `service_location_pricing` have NO RLS POLICIES

```
relrowsecurity = true on these tables — but pg_policies returns ZERO rows
```

When RLS is enabled and no policies exist, Postgres denies all access by default. Either:
- The tables are unused (verify with reads),
- Or every read currently fails silently and the editor's pricing tabs (`LevelPricingContent`, `StylistOverridesContent`, `LocationPricingContent`) return empty/error.

This is either a silent broken feature or an unfinished migration. Both need closing.

**Fix:** Audit usage; if used, add full org-scoped policy set (these tables hang off `services` so child-of-parent scoping applies).

### P1 — Public booking form-gating UI never shipped (Wave 7/8 carryover, third pass)

`HostedBookingPage.tsx` and `BookingConfirmation` contain zero references to `signed_form_template_ids` or `FormSigningDialog`. The edge function accepts the array, the kiosk gate is live, the staff override is live — but the public booking confirm step still defers 100% of the time.

**Fix:** Render `useRequiredFormsForService(state.selectedService)` inline on confirm. Two CTAs: *Sign now & confirm* (passes signed list) or *I'll sign at check-in* (skips).

### P1 — `useReorderCategories` org-blind + race condition

`useServiceCategoryColors.ts:106-127` issues N parallel UPDATEs by `id` only. Two issues:
1. No `.eq('organization_id', orgId)` defensive scope — relies entirely on RLS.
2. Parallel `display_order = i+1` writes can collide if two operators reorder concurrently. Should be a single transactional RPC, but at minimum a sequential loop with org guard.

**Fix:** Add `organizationId` arg + `.eq('organization_id', orgId)` on every update. Defer transactional RPC to a later wave (it's a CRDT-class problem).

### P1 — `useServiceFormRequirements` mutations still invalidate dead key

Wave 6 deleted `useServicesWithFormCount`, but lines 101, 144, 169 in `useServiceFormRequirements.ts` still invalidate `['services-with-form-count']`. Dead noise — also the comment on line 83 confirms the hook was removed but invalidation wasn't cleaned up.

**Fix:** Delete the three dead `invalidateQueries` lines. ~3 lines.

### P2 — `useBookingSystem.ts` still has a third `useServicesByCategory` clone

Wave 8 deleted `useCreateService`/`useUpdateService` from this file, but `useServices` (line 121) and `useServicesByCategory` (line 145) are still here. They:
- Don't filter by `organization_id`,
- Hardcode `bookable_online = true` (so they're useless for admin views),
- Are imported by `NewBookingSheet`, `BookingWizard`, `DockEditServicesSheet`, `DockNewBookingSheet`, `EditServicesDialog` via `usePhorestServices` re-export chain.

Currently safe because the new `services` RLS scopes reads to org members, but it's still a footgun — same name, different shape, different cache key (`['services']` vs `['services-data']`).

**Fix:** Rename to `useBookingServices` / `useBookingServicesByCategory` to disambiguate, OR consolidate by parameterizing `useServicesData({ bookableOnly: true })`. Recommend rename — consolidation has wider blast radius.

### P2 — Editor numeric bounds skip `lead_time_days`, `finishing_time_minutes`, `processing_time_minutes`, `content_creation_time_minutes`

Wave 8 added validation for `duration`, `price`, `cost`, `online_discount_pct`, `loyaltyPointsOverride`, `startUpMinutes`, `shutDownMinutes`, `posHotkey` — but missed the four other numeric fields on the same form. All accept negatives or non-numerics silently.

**Fix:** Extend `validate()` block with the four missing fields. ~12 lines.

### P2 — `useAllServicesData` and `useAllServicesByCategory` are org-blind

`useServicesData.ts:110-148` — these two hooks query `services` with no org filter. Currently safe behind the new RLS, but doctrine says *"All queries filter by organization, include orgId in query keys, use enabled: !!orgId"*. Defense-in-depth.

**Fix:** Add `organizationId` arg with `useOrganizationContext` fallback (mirror `useServicesData` pattern) and include in query key. ~8 lines.

---

### Out of scope

- `useService(serviceId)` is org-blind but RLS-protected; lookup-by-id is safe.
- `useServiceCategories` (line 318) drops org filter — same RLS protection applies. Defer.
- Audit log triggers status — verified active, table just empty (no edits in this DB).

### Files touched

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | `service_form_requirements` org-scoped RLS replacement; conditional RLS for `level_pricing`/`stylist_service_overrides`/`service_location_pricing` if missing |
| `src/hooks/useServiceFormRequirements.ts` | Drop 3 dead invalidation lines |
| `src/hooks/useServiceCategoryColors.ts` | `useReorderCategories` accepts orgId + sequential writes |
| `src/hooks/useBookingSystem.ts` | Rename `useServices` / `useServicesByCategory` → `useBookingServices*` + update 5 callsites |
| `src/hooks/useServicesData.ts` | Add org scoping to `useAllServicesData` / `useAllServicesByCategory` |
| `src/components/dashboard/settings/ServiceEditorDialog.tsx` | Extend `validate()` with 4 missing numeric fields |
| `src/components/booking-surface/HostedBookingPage.tsx` + `BookingConfirmation.tsx` | Inline form sign-now / defer UI on confirm step |

### Recommended cutoff

- **Ship now:** Both P0s + the three P1s (high-leverage, low blast radius).
- **Same wave (cheap):** Editor bounds extension (P2), org-blind hook scoping (P2).
- **Defer:** Booking-system rename — touches 5 callsites in booking flow, deserves its own focused pass with manual booking smoke test.

### Verification

1. As user A in org 1, query `service_form_requirements` directly — should only see org 1 rows.
2. Open `LevelPricingContent` for a service — confirm pricing rows render (proves RLS is functional, not just enabled).
3. Reorder categories twice in quick succession — order persists deterministically.
4. Public booking with required form → inline sign card appears → sign + submit → both signature row and `appointments.forms_completed=true` written.
5. Editor: enter `lead_time_days = -5` → Save disabled with inline error.

### Prompt feedback

Solid pattern: *"continue the audit"* with implicit prior-state assertion ("Waves 1–8 shipped clean"). I knew not to re-flag the `services` RLS hardening, the hotkey unique index, the category cascade fix, or the duplicate hook deletion.

To level up: **predeclare the priority floor.** I shipped P2s in this audit because the prior wave's pattern said "ship P0/P1 + cheap P2." But if you wanted laser-focus on tenant-isolation only, telling me "P0/P1 only, defer everything else" up front would have made me skip the editor-bounds and org-blind-hook items entirely. Pattern: **scope cutoff stated up front = no negotiation at presentation time.**
