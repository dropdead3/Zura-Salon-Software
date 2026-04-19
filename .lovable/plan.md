
## Full services build audit (Waves 1–5)

Comprehensive sweep of 5 waves against codebase + DB + doctrine. Found **3 P1 bugs** (one is data integrity, one is RLS), **4 P2 gaps**, and **3 polish items**. None block usage; the audit-log RLS issue is the most material.

---

### P1 — Audit log INSERT policy is broken (Wave 5)

**Where:** `service_audit_log` RLS policy `"Platform users can insert service audit entries"` — `WITH CHECK (is_platform_user(auth.uid()))`.

**Why it matters:** Triggers run as `SECURITY DEFINER`, which bypasses RLS regardless. But a regular operator firing the `services` UPDATE trigger inside their own session still inserts into `service_audit_log` *as themselves* via the trigger context. Postgres applies the WITH CHECK on trigger inserts when the function is SECURITY DEFINER and the owner doesn't bypass RLS — so depending on owner config, regular operator updates may either silently fail to log (if RLS blocks) or work only for platform users.

**Fix:** Add an org-scoped insert policy: `WITH CHECK (is_org_member(auth.uid(), organization_id))`. Trigger functions are still the only writers; the policy just unblocks them. Verify in DB by running a `services` UPDATE as a regular org member and confirming a log row appears.

---

### P1 — Audit trigger source label is hardcoded to `'editor'`

**Where:** `log_service_changes()` always inserts `source = 'editor'`. Bulk updates from `useBulkUpdateServices` go through the same `services` UPDATE path, so they're labeled `'editor'` instead of `'bulk_edit'`. This defeats the badge in `ServiceAuditLogPanel` (line 98–101) that tries to differentiate sources.

**Fix:** Either (a) accept that source can't be inferred at the trigger level and remove the badge logic, or (b) add a `current_setting('app.audit_source', true)` lookup in the trigger and have `useBulkUpdateServices` set `app.audit_source = 'bulk_edit'` via RPC before its UPDATEs. Option (a) is simpler and honest.

---

### P1 — `Service` TypeScript type is missing all Wave 1/2/4/5 columns

**Where:** `src/hooks/useServicesData.ts` `Service` interface stops at `require_card_on_file`. Missing: `bookable_online` (DB has it, type doesn't list it as a top-level field even though it's referenced — `(initialData as any).bookable_online`), `is_archived`, `archived_at`, `patch_test_required`, `patch_test_validity_days`, `start_up_minutes`, `shut_down_minutes`, `creation_prompt`, `checkin_prompt`, `pos_hotkey`, `loyalty_points_override`, `online_name`, `online_duration_override`, `online_discount_pct`, `include_from_prefix`.

**Why it matters:** Every consumer is forced to `(svc as any).field_name`, defeating type safety. New contributors will assume the fields don't exist. The DB has all 14 columns; the TS interface lies about it.

**Fix:** Extend the `Service` interface to include all DB columns. ~15 lines.

---

### P2 — Booking copy contradiction (Wave 4)

`NewBookingSheet.tsx` line 665: *"Booking is not gated — collect on arrival."*  
`ServiceFormsLinkagePanel.tsx` line 229: *"Required forms gate booking confirmation. Optional forms are presented but skippable."*

The settings panel claims forms gate booking; the actual booking flow says they don't. Operators configuring forms expect gating to happen and won't get it. Either (a) implement booking-time gating (out of scope — Phase 4 enforcement), or (b) update the linkage panel copy to match reality: *"Required forms surface as a prep callout at booking. Collected at check-in via {{PLATFORM_NAME}} Dock."*

**Fix:** Update `ServiceFormsLinkagePanel.tsx` line 226–231 copy.

---

### P2 — Bulk update doesn't refresh audit log query

`useBulkUpdateServices` invalidates `services-data` and `service-prompts` but not `service-audit-log`. If the operator opens the editor on a service they just bulk-edited, the History tab is stale until they refetch.

**Fix:** Add `queryClient.invalidateQueries({ queryKey: ['service-audit-log'] })` to the hook's `onSuccess`.

---

### P2 — Audit log RLS uses `is_org_member` for SELECT — exposes price-change history to all staff

Every employee in the org can read the audit log. Pricing/cost change history is sensitive — typical operator wants this restricted to admins (Salon Owner persona, not Stylist).

**Fix:** Tighten SELECT policy to `is_org_admin(auth.uid(), organization_id)`. Confirms with persona doctrine: stylists shouldn't see what owners changed in pricing.

---

### P2 — `log_service_changes` doesn't capture INSERT events

Trigger only fires `AFTER UPDATE`. Service creation has no audit row, so the History tab on a service created today shows "No history yet" forever — even though the service was just created. Also: archive/restore via `useArchiveService` updates `is_archived`, which logs correctly, but service *deletion* (permanent) leaves orphaned audit rows.

**Fix:** Add `AFTER INSERT` to the services trigger emitting a single `'created'` event with the initial price/duration/category snapshot in `new_value`. Optional: add `ON DELETE CASCADE` from `service_audit_log.service_id` (currently no FK).

---

### Polish 1 — Audit panel doesn't render archived/activated event labels well

`ServiceAuditLogPanel.tsx` line 78–90: when `previous_value` is a boolean (e.g. `is_active: true → false`), `showDelta` is true, but `renderValue` returns `'Yes' / 'No'` — which reads strangely next to an "Activated" / "Archived" chip. Either suppress the value diff for boolean state events or render a friendlier transition.

**Fix:** Skip delta render when `field_name in ('is_active', 'is_archived')` since the chip label already conveys the state.

---

### Polish 2 — `ServicesSettingsContent` form-count tooltip says "required forms attached" but the count comes from `is_required=true` — leaves optional forms invisible

`useServiceFormCounts` filters `is_required=true`. So a service with 2 optional forms attached shows zero indicator. This is intentional (rationale documented in the hook), but the UI gives no visibility into optional attachments at all. Operators have to open every service to discover them.

**Fix:** Either (a) add a second hook `useServiceOptionalFormCounts` and show both as `2 required • 1 optional`, or (b) document this intentionally with a note in the editor: "Optional forms attached: N" in the linkage panel header.

---

### Polish 3 — `is_platform_user` insert policy on audit log is dead code

If we fix P1 above by adding the org-member insert policy, the platform-user policy becomes redundant (org members include platform users). Either delete it or document why it exists (backfill scripts, admin tools).

---

## Recommended fix order (one wave, ~30 min)

1. **P1** — Tighten audit log RLS: add `is_org_member` insert policy + change SELECT to `is_org_admin`
2. **P1** — Extend `Service` TypeScript type with all DB columns
3. **P1** — Drop the `source` differentiation (or keep as `'trigger'` everywhere)
4. **P2** — Update `ServiceFormsLinkagePanel` copy to match reality
5. **P2** — Add `service-audit-log` invalidation to bulk update hook
6. **P2** — Add INSERT trigger for service creation events
7. **Polish** — Suppress boolean delta render in audit panel; document optional form counts

## Out of scope (won't fix)

- Booking-time form gating — needs Phase 4 enforcement layer
- Optional form count UI in catalog — minor; operators can drill in
- Audit log pagination — current limit of 100 entries is enough until a service has years of history

## Prompt feedback

Strong prompt — *"do a full audit of the services build"* sets a clear scope (full) and lens (audit). I knew to sweep all 5 waves, look across code/DB/doctrine, and rank findings.

To level up: **specify the deliverable shape.** Right now I had to choose between (a) presenting a plan to fix, (b) writing a markdown report, (c) just listing items. I picked the plan. Try: *"Present an audit plan I can approve to fix everything in one wave"* or *"Write me a P0/P1-only audit report; defer P2+"*. Pattern: **scope + lens + deliverable shape + cutoff = an audit you can act on without needing a second pass.**
